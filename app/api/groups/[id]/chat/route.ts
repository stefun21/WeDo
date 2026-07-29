import { NextResponse } from "next/server";
import webpush from "web-push";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

async function member(groupId: string, userId: string) {
  await ensureSchema();
  const query = sql();
  const rows = await query`SELECT 1 FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId} LIMIT 1`;
  return rows.length > 0;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!(await member(id, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const markRead = url.searchParams.get("markRead") === "1";
  const query = sql();
  const messages = after
    ? await query`
        SELECT m.id, m.body, m.created_at, m.user_id, u.display_name
        FROM messages m JOIN users u ON u.id = m.user_id
        WHERE m.group_id = ${id} AND m.created_at > ${after}
        ORDER BY m.created_at ASC LIMIT 100
      `
    : await query`
        SELECT * FROM (
          SELECT m.id, m.body, m.created_at, m.user_id, u.display_name
          FROM messages m JOIN users u ON u.id = m.user_id
          WHERE m.group_id = ${id} ORDER BY m.created_at DESC LIMIT 60
        ) recent ORDER BY created_at ASC
      `;
  const unreadRows = await query`
    SELECT COUNT(*)::int AS unread_count
    FROM messages m
    LEFT JOIN message_reads mr ON mr.group_id = m.group_id AND mr.user_id = ${user.id}
    WHERE m.group_id = ${id}
      AND m.user_id <> ${user.id}
      AND m.created_at > COALESCE(mr.last_read_at, to_timestamp(0))
  `;
  if (markRead) {
    await query`
      INSERT INTO message_reads (group_id, user_id, last_read_at)
      VALUES (${id}, ${user.id}, NOW())
      ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_at = NOW()
    `;
  }
  return NextResponse.json({ messages, unreadCount: markRead ? 0 : Number(unreadRows[0]?.unread_count || 0) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!(await member(id, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const message = String(body.message || "").trim();
  if (!message || message.length > 2000) return NextResponse.json({ error: "Message must contain 1–2000 characters." }, { status: 400 });
  const query = sql();
  const rows = await query`
    INSERT INTO messages (group_id, user_id, body)
    VALUES (${id}, ${user.id}, ${message})
    RETURNING id, body, created_at, user_id
  `;
  await query`
    INSERT INTO message_reads (group_id, user_id, last_read_at)
    VALUES (${id}, ${user.id}, NOW())
    ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_at = NOW()
  `;
  await sendPushNotifications(id, user.id, user.displayName, message);
  return NextResponse.json({ message: { ...rows[0], display_name: user.displayName } }, { status: 201 });
}

async function sendPushNotifications(groupId: string, senderId: string, senderName: string, message: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  try {
    webpush.setVapidDetails("mailto:notifications@wedo.app", publicKey, privateKey);
    const query = sql();
    const subscriptions = await query`
      SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
      FROM push_subscriptions ps
      JOIN group_members gm ON gm.user_id = ps.user_id
      WHERE gm.group_id = ${groupId} AND ps.user_id <> ${senderId}
    `;
    await Promise.allSettled(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: String(subscription.endpoint),
          keys: { p256dh: String(subscription.p256dh), auth: String(subscription.auth) },
        }, JSON.stringify({ title: `${senderName} in WeDo`, body: message.slice(0, 140), url: "/" }));
      } catch (error: unknown) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) await query`DELETE FROM push_subscriptions WHERE id = ${subscription.id}`;
      }
    }));
  } catch (error) {
    console.error("Push notification error", error);
  }
}
