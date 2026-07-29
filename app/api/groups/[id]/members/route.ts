import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await ensureSchema();
  const query = sql();
  const member = await query`SELECT 1 FROM group_members WHERE group_id = ${id} AND user_id = ${user.id}`;
  if (!member.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const members = await query`
    SELECT u.id, u.username, u.display_name, gm.role, gm.joined_at
    FROM group_members gm JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ${id} ORDER BY gm.joined_at
  `;
  return NextResponse.json({ members });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await ensureSchema();
  const query = sql();
  const owner = await query`SELECT 1 FROM group_members WHERE group_id = ${id} AND user_id = ${user.id} AND role = 'owner'`;
  if (!owner.length) return NextResponse.json({ error: "Only the owner can change roles." }, { status: 403 });
  const body = await request.json();
  const memberId = String(body.memberId || "");
  const role = String(body.role || "");
  if (!["admin", "member"].includes(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  await query`UPDATE group_members SET role = ${role} WHERE group_id = ${id} AND user_id = ${memberId} AND role <> 'owner'`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await ensureSchema();
  const query = sql();
  const owner = await query`SELECT 1 FROM group_members WHERE group_id = ${id} AND user_id = ${user.id} AND role = 'owner'`;
  if (!owner.length) return NextResponse.json({ error: "Only the owner can remove members." }, { status: 403 });
  const memberId = new URL(request.url).searchParams.get("memberId") || "";
  await query`DELETE FROM group_members WHERE group_id = ${id} AND user_id = ${memberId} AND role <> 'owner'`;
  return NextResponse.json({ ok: true });
}
