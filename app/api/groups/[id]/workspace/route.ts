import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

async function access(groupId: string, userId: string) {
  await ensureSchema();
  const query = sql();
  const rows = await query`SELECT role FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId} LIMIT 1`;
  return rows.length > 0;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!(await access(id, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const query = sql();
  const [tasks, shopping] = await Promise.all([
    query`
      SELECT t.id, t.title, t.completed, t.due_date, t.assigned_to,
             COALESCE(u.display_name, '') AS assigned_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.group_id = ${id} ORDER BY t.completed, t.created_at DESC
    `,
    query`
      SELECT id, name, quantity, completed
      FROM shopping_items WHERE group_id = ${id}
      ORDER BY completed, created_at DESC
    `,
  ]);
  return NextResponse.json({ tasks, shopping });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!(await access(id, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const query = sql();
  if (body.type === "task") {
    const title = String(body.title || "").trim();
    if (!title || title.length > 180) return NextResponse.json({ error: "Task title must contain 1–180 characters." }, { status: 400 });
    const dueDate = body.dueDate ? String(body.dueDate) : null;
    const rows = await query`
      INSERT INTO tasks (group_id, title, created_by, due_date)
      VALUES (${id}, ${title}, ${user.id}, ${dueDate}) RETURNING id
    `;
    return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
  }
  if (body.type === "shopping") {
    const name = String(body.name || "").trim();
    const quantity = String(body.quantity || "").trim().slice(0, 30) || null;
    if (!name || name.length > 180) return NextResponse.json({ error: "Item name must contain 1–180 characters." }, { status: 400 });
    const rows = await query`
      INSERT INTO shopping_items (group_id, name, quantity, created_by)
      VALUES (${id}, ${name}, ${quantity}, ${user.id}) RETURNING id
    `;
    return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
  }
  return NextResponse.json({ error: "Invalid item type." }, { status: 400 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!(await access(id, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const itemId = String(body.itemId || "");
  const query = sql();
  if (body.action === "edit" && body.type === "task") {
    const title = String(body.title || "").trim();
    if (!title || title.length > 180) return NextResponse.json({ error: "Task title must contain 1–180 characters." }, { status: 400 });
    const dueDate = body.dueDate ? String(body.dueDate) : null;
    const assignedTo = body.assignedTo ? String(body.assignedTo) : null;
    await query`UPDATE tasks SET title = ${title}, due_date = ${dueDate}, assigned_to = ${assignedTo}, updated_at = NOW() WHERE id = ${itemId} AND group_id = ${id}`;
  } else if (body.action === "edit" && body.type === "shopping") {
    const name = String(body.name || "").trim();
    const quantity = String(body.quantity || "").trim().slice(0, 30) || null;
    if (!name || name.length > 180) return NextResponse.json({ error: "Item name must contain 1–180 characters." }, { status: 400 });
    await query`UPDATE shopping_items SET name = ${name}, quantity = ${quantity}, updated_at = NOW() WHERE id = ${itemId} AND group_id = ${id}`;
  } else if (body.type === "task") await query`UPDATE tasks SET completed = ${Boolean(body.completed)}, updated_at = NOW() WHERE id = ${itemId} AND group_id = ${id}`;
  else if (body.type === "shopping") await query`UPDATE shopping_items SET completed = ${Boolean(body.completed)}, updated_at = NOW() WHERE id = ${itemId} AND group_id = ${id}`;
  else return NextResponse.json({ error: "Invalid item type." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!(await access(id, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const itemId = url.searchParams.get("itemId") || "";
  const query = sql();
  if (type === "task") await query`DELETE FROM tasks WHERE id = ${itemId} AND group_id = ${id}`;
  else if (type === "shopping") await query`DELETE FROM shopping_items WHERE id = ${itemId} AND group_id = ${id}`;
  else return NextResponse.json({ error: "Invalid item type." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
