import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const code = String(body.code || "").trim().toUpperCase();
    await ensureSchema();
    const query = sql();
    const rows = await query`
      SELECT id, group_id, invite_role FROM group_invites
      WHERE code = ${code} AND revoked = FALSE AND expires_at > NOW() AND uses < max_uses
      LIMIT 1
    `;
    if (!rows.length) return NextResponse.json({ error: "This invitation is invalid or expired." }, { status: 404 });
    const joined = await query`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${rows[0].group_id}, ${user.id}, ${rows[0].invite_role})
      ON CONFLICT (group_id, user_id) DO NOTHING
      RETURNING group_id
    `;
    if (joined.length) {
      await query`UPDATE group_invites SET uses = uses + 1 WHERE id = ${rows[0].id}`;
      await query`
        INSERT INTO group_activity (group_id, user_id, action, entity_type, entity_id, summary)
        VALUES (${rows[0].group_id}, ${user.id}, 'joined', 'member', ${user.id}, ${user.displayName})
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Join group error", error);
    return NextResponse.json({ error: "The group could not be joined." }, { status: 500 });
  }
}
