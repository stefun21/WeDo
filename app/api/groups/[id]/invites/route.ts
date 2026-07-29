import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { inviteCode } from "@/lib/groups";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    await ensureSchema();
    const query = sql();
    const membership = await query`SELECT role FROM group_members WHERE group_id = ${id} AND user_id = ${user.id} LIMIT 1`;
    if (!membership.length || !["owner", "admin"].includes(String(membership[0].role))) return NextResponse.json({ error: "Only owners and admins can invite members." }, { status: 403 });
    const body = await request.json();
    const role = String(body.role || "member");
    if (!["admin", "member"].includes(role)) return NextResponse.json({ error: "Invalid invitation role." }, { status: 400 });
    if (role === "admin" && membership[0].role !== "owner") return NextResponse.json({ error: "Only the owner can invite administrators." }, { status: 403 });
    const code = inviteCode();
    await query`
      INSERT INTO group_invites (group_id, code, created_by, expires_at, invite_role)
      VALUES (${id}, ${code}, ${user.id}, NOW() + INTERVAL '7 days', ${role})
    `;
    return NextResponse.json({ code, role, expiresIn: "7 days" }, { status: 201 });
  } catch (error) {
    console.error("Invite error", error);
    return NextResponse.json({ error: "The invitation could not be created." }, { status: 500 });
  }
}
