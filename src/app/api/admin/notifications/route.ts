import { z } from "zod";
import { handle } from "@/server/http/handler";
import { listNotifications, markNotificationsRead, unreadNotificationCount } from "@/server/repositories/notifications.repository";
import { getOrderByRef } from "@/server/repositories/orders.repository";

const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(60).default(15) });
const readSchema = z.object({ ids: z.array(z.number().int().positive()).max(60).optional() });

/** The dashboard bell. Small on purpose: the poller calls this every ~40 seconds. */
export const GET = handle({ auth: "admin", query: querySchema }, async ({ query }) => {
  const items = listNotifications({ limit: query.limit }).map((entry) => ({
    id: entry.id,
    event: entry.event,
    title: entry.title,
    body: entry.body,
    orderRef: entry.orderRef,
    // The order id is included when the order still exists, so the bell can link
    // straight to it instead of making the owner search.
    orderId: entry.orderRef ? (getOrderByRef(entry.orderRef)?.id ?? null) : null,
    readAt: entry.readAt,
    createdAt: entry.createdAt,
  }));
  return { items, unread: unreadNotificationCount() };
});

export const POST = handle<z.infer<typeof readSchema>>({ auth: "admin", body: readSchema }, async ({ body }) => markNotificationsRead(body.ids));
