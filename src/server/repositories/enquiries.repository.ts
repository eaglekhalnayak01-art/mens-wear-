import { all, get, insert, run } from "@/server/db";

export type EnquiryRow = {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  topic: string;
  message: string;
  status: string;
  createdAt: string;
};

export function createEnquiry(input: { name: string; mobile: string; email?: string; topic: string; message: string }) {
  const id = insert(
    `INSERT INTO enquiries (name, mobile, email, topic, message) VALUES (?,?,?,?,?)`,
    input.name,
    input.mobile,
    input.email || null,
    input.topic,
    input.message,
  );
  return id;
}

export function listEnquiries(filter: { status?: string; limit?: number } = {}) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filter.status && filter.status !== "all") {
    clauses.push("status = ?");
    params.push(filter.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all<EnquiryRow>(
    `SELECT id, name, mobile, email, topic, message, status, created_at AS createdAt
       FROM enquiries ${where} ORDER BY id DESC LIMIT ?`,
    ...params,
    filter.limit ?? 50,
  );
}

export function enquiryStats() {
  return (
    get<{ total: number; open: number }>(
      `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END),0) AS open FROM enquiries`,
    ) ?? { total: 0, open: 0 }
  );
}

export function setEnquiryStatus(id: number, status: "new" | "replied" | "closed") {
  return run(`UPDATE enquiries SET status = ? WHERE id = ?`, status, id).changes;
}
