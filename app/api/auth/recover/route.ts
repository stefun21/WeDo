import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, generateRecoveryCode, normalizeUsername } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = normalizeUsername(body.username);
    const recoveryCode = String(body.recoveryCode || "").trim().toUpperCase();
    const password = String(body.password || "");
    if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Password must contain 8–72 characters." }, { status: 400 });

    await ensureSchema();
    const query = sql();
    const rows = await query`
      SELECT id, username, display_name, recovery_hash
      FROM users WHERE username = ${username} LIMIT 1
    `;
    const user = rows[0];
    if (!user || !(await bcrypt.compare(recoveryCode, String(user.recovery_hash)))) {
      return NextResponse.json({ error: "Username or recovery code is incorrect." }, { status: 401 });
    }

    const newRecoveryCode = generateRecoveryCode();
    const [passwordHash, recoveryHash] = await Promise.all([
      bcrypt.hash(password, 12),
      bcrypt.hash(newRecoveryCode, 12),
    ]);
    await query`
      UPDATE users SET password_hash = ${passwordHash}, recovery_hash = ${recoveryHash}, updated_at = NOW()
      WHERE id = ${user.id}
    `;
    await createSession({ id: String(user.id), username: String(user.username), displayName: String(user.display_name) });
    return NextResponse.json({ ok: true, recoveryCode: newRecoveryCode });
  } catch (error) {
    console.error("Recovery error", error);
    return NextResponse.json({ error: "Account recovery is temporarily unavailable." }, { status: 500 });
  }
}
