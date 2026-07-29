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
  const activity = await query`
    SELECT ga.id, ga.action, ga.entity_type, ga.entity_id, ga.summary, ga.created_at,
           u.id AS user_id, u.display_name
    FROM group_activity ga
    JOIN users u ON u.id = ga.user_id
    WHERE ga.group_id = ${id}
    ORDER BY ga.created_at DESC
    LIMIT 30
  `;
  return NextResponse.json({ activity });
}
