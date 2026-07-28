import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { getUserGroups } from "@/lib/groups";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ groups: await getUserGroups(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name } = await request.json();
    const groupName = String(name || "").trim();
    if (groupName.length < 2 || groupName.length > 60) return NextResponse.json({ error: "Group name must contain 2–60 characters." }, { status: 400 });
    await ensureSchema();
    const query = sql();
    const rows = await query`INSERT INTO groups (name, owner_id) VALUES (${groupName}, ${user.id}) RETURNING id`;
    await query`INSERT INTO group_members (group_id, user_id, role) VALUES (${rows[0].id}, ${user.id}, 'owner')`;
    return NextResponse.json({ ok: true, groupId: rows[0].id }, { status: 201 });
  } catch (error) {
    console.error("Create group error", error);
    return NextResponse.json({ error: "The group could not be created." }, { status: 500 });
  }
}
