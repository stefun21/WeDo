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
