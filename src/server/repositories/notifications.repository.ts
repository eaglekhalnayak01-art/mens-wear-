/**
 * Owner alerts.
 *
 * Every event that should reach the shop owner is written here before anything is
 * sent, so a failed webhook or a closed laptop never loses the fact itself — the
 * dashboard bell reads this table, and delivery is an extra, not the record.
 */
import { all, get, insert, nowIso, run } from "@/server/db";

export type NotificationRow = {
  id: number;
  event: string;
  title: string;
  body: string;
  channel: string;
  target: string | null;
  orderRef: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
};

export function createNotification(input: {
  event: string;
  title: string;
  body: string;
  channel?: "inbox" | "webhook" | "whatsapp" | "email";
  target?: string | null;
  orderRef?: string | null;
  sentAt?: string | null;
}): number {
  return insert(
    `INSERT INTO notifications (event, title, body, channel, target, order_ref, sent_at)
     VALUES (?,?,?,?,?,?,?)`,
    input.event,
    input.title.slice(0, 160),
    input.body.slice(0, 2000),
    input.channel ?? "inbox",
    input.target ?? null,
    input.orderRef ?? null,
    input.sentAt ?? null,
  );
}

/** The bell shows the shop's own inbox rows; the channel rows below them are delivery attempts. */
const INBOX = `channel = 'inbox'`;

export function listNotifications(filter: { limit?: number; unreadOnly?: boolean } = {}): NotificationRow[] {
  const limit = Math.max(1, Math.min(100, filter.limit ?? 20));
  return all<NotificationRow>(
    `SELECT id, event, title, body, channel, target, order_ref AS orderRef,
            sent_at AS sentAt, read_at AS readAt, created_at AS createdAt
       FROM notifications
      WHERE ${INBOX}${filter.unreadOnly ? " AND read_at IS NULL" : ""}
      ORDER BY id DESC LIMIT ?`,
    limit,
  );
}

export function unreadNotificationCount(): number {
  return get<{ n: number }>(`SELECT COUNT(*) AS n FROM notifications WHERE ${INBOX} AND read_at IS NULL`)?.n ?? 0;
}

export function markNotificationsRead(ids?: number[]) {
  if (!ids || ids.length === 0) {
    const res = run(`UPDATE notifications SET read_at = ? WHERE read_at IS NULL AND ${INBOX}`, nowIso());
    return { marked: res.changes };
  }
  const marks = ids.map(() => "?").join(",");
  const res = run(
    `UPDATE notifications SET read_at = ? WHERE read_at IS NULL AND ${INBOX} AND id IN (${marks})`,
    nowIso(),
    ...ids,
  );
  return { marked: res.changes };
}

/** Newest order reference per alert, so the bell can deep-link to the order. */

