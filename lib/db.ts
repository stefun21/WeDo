import { neon } from "@neondatabase/serverless";

export function sql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return neon(connectionString);
}

export async function ensureSchema() {
  const query = sql();
  await query`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(24) UNIQUE NOT NULL,
      display_name VARCHAR(40) NOT NULL,
      password_hash TEXT NOT NULL,
      recovery_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(60) NOT NULL,
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(12) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (group_id, user_id)
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS group_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      code VARCHAR(14) UNIQUE NOT NULL,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 20,
      uses INTEGER NOT NULL DEFAULT 0,
      invite_role VARCHAR(12) NOT NULL DEFAULT 'member' CHECK (invite_role IN ('admin', 'member')),
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await query`ALTER TABLE group_invites ADD COLUMN IF NOT EXISTS invite_role VARCHAR(12) NOT NULL DEFAULT 'member'`;
  await query`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      title VARCHAR(180) NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS shopping_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      name VARCHAR(180) NOT NULL,
      quantity VARCHAR(30),
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body VARCHAR(2000) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      edited_at TIMESTAMPTZ
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS message_reads (
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (group_id, user_id)
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}
