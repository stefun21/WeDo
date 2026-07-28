import { ensureSchema, sql } from "./db";

export type UserGroup = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
  memberCount: number;
};

export async function getUserGroups(userId: string): Promise<UserGroup[]> {
  await ensureSchema();
  const query = sql();
  const rows = await query`
    SELECT g.id, g.name, gm.role, COUNT(all_members.user_id)::int AS member_count
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    LEFT JOIN group_members all_members ON all_members.group_id = g.id
    WHERE gm.user_id = ${userId}
    GROUP BY g.id, g.name, gm.role, gm.joined_at
    ORDER BY gm.joined_at ASC
  `;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    role: row.role as UserGroup["role"],
    memberCount: Number(row.member_count),
  }));
}

export function inviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const value = Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
  return `WEDO-${value}`;
}
