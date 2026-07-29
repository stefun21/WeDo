import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, generateRecoveryCode, normalizeUsername, validUsername } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = normalizeUsername(body.username);
    const displayName = String(body.displayName || "").trim();
    const password = String(body.password || "");
    const inviteCode = String(body.inviteCode || "").trim().toUpperCase();

    if (!validUsername(username)) return NextResponse.json({ error: "Username must use 3–24 letters, numbers, _ or -." }, { status: 400 });
    if (displayName.length < 2 || displayName.length > 40) return NextResponse.json({ error: "Display name must contain 2–40 characters." }, { status: 400 });
    if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Password must contain 8–72 characters." }, { status: 400 });

    await ensureSchema();
    const query = sql();
    const existing = await query`SELECT id FROM users WHERE username = ${username} LIMIT 1`;
    if (existing.length) return NextResponse.json({ error: "This username is already taken." }, { status: 409 });
    const invitation = inviteCode ? await query`
      SELECT id, group_id, invite_role
      FROM group_invites
      WHERE code = ${inviteCode} AND revoked = FALSE AND expires_at > NOW() AND uses < max_uses
      LIMIT 1
    ` : [];
    if (inviteCode && !invitation.length) {
      return NextResponse.json({ error: "This group invitation is invalid or has expired." }, { status: 400 });
    }

    const recoveryCode = generateRecoveryCode();
    const [passwordHash, recoveryHash] = await Promise.all([
      bcrypt.hash(password, 12),
      bcrypt.hash(recoveryCode, 12),
    ]);
    const userId = crypto.randomUUID();
    if (invitation.length) {
      await query.transaction([
        query`
          INSERT INTO users (id, username, display_name, password_hash, recovery_hash)
          VALUES (${userId}, ${username}, ${displayName}, ${passwordHash}, ${recoveryHash})
        `,
        query`
          INSERT INTO group_members (group_id, user_id, role)
          VALUES (${invitation[0].group_id}, ${userId}, ${invitation[0].invite_role})
        `,
        query`UPDATE group_invites SET uses = uses + 1 WHERE id = ${invitation[0].id}`,
      ]);
    } else {
      await query`
        INSERT INTO users (id, username, display_name, password_hash, recovery_hash)
        VALUES (${userId}, ${username}, ${displayName}, ${passwordHash}, ${recoveryHash})
      `;
    }
    const user = { id: userId, username, display_name: displayName };
    await createSession({ id: String(user.id), username: String(user.username), displayName: String(user.display_name) });
    return NextResponse.json({ ok: true, recoveryCode }, { status: 201 });
  } catch (error) {
    console.error("Register error", error);
    return NextResponse.json({ error: "Account creation is unavailable. Check the database setup." }, { status: 500 });
  }
}
