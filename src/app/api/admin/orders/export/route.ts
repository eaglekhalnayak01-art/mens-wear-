import { z } from "zod";
import { NextResponse } from "next/server";
import { handle } from "@/server/http/handler";
import { orderFilterSchema } from "@/server/validation/schemas";
import { listAdminOrders } from "@/server/repositories/orders.repository";

const MAX_ROWS = 5000;

function cell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV for the accounts pile. Quoting is handled properly because addresses contain
 * commas, and the file is generated from the same filter the table is showing.
 */
export const GET = handle({ auth: "admin", query: orderFilterSchema }, async ({ query }) => {
  const { items } = listAdminOrders({ ...query, page: 1, perPage: MAX_ROWS });
  const header = [
    "Order",
    "Placed",
    "Status",
    "Customer",
    "Mobile",
    "City",
    "PIN",
    "Items",
    "Subtotal",
    "Discount",
    "Shipping",
    "Total",
    "Payment",
    "Payment status",
  ];

  const rows = items.map((order) =>
    [
      order.publicRef,
      order.placedAt,
      order.status,
      order.customerName,
      order.customerMobile,
      order.city ?? "",
      order.pin ?? "",
      order.itemCount,
      order.subtotal ?? "",
      order.discount ?? "",
      order.shipping ?? "",
      order.total,
      order.paymentMethod,
      order.paymentStatus,
    ]
      .map(cell)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="aakash-orders-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
});
