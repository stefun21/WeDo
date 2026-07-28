import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, normalizeUsername } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = normalizeUsername(body.username);
    const password = String(body.password || "");
    await ensureSchema();
    const query = sql();
    const rows = await query`
      SELECT id, username, display_name, password_hash
      FROM users WHERE username = ${username} LIMIT 1
    `;
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, String(user.password_hash)))) {
      return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
    }
    await createSession({ id: String(user.id), username: String(user.username), displayName: String(user.display_name) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json({ error: "Sign in is temporarily unavailable." }, { status: 500 });
  }
}
