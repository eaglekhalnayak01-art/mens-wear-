import { all, get, insert, run, tx } from "@/server/db";
import { slugify } from "@/lib/format";

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  blurb: string | null;
  image: string | null;
  sort: number;
  is_active: number;
  parent_id: number | null;
  count: number;
  priceFrom: number | null;
};

export function listCategories({ includeInactive = false, withCounts = true } = {}): CategoryRow[] {
  return all<CategoryRow>(
    `SELECT c.id, c.name, c.slug, c.blurb, c.image, c.sort, c.is_active, c.parent_id,
            ${withCounts ? "(SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'published')" : "0"} AS count,
            ${withCounts ? "(SELECT MIN(p.price) FROM products p WHERE p.category_id = c.id AND p.status = 'published')" : "NULL"} AS priceFrom
       FROM categories c
      ${includeInactive ? "" : "WHERE c.is_active = 1"}
      ORDER BY c.sort ASC, c.name ASC`,
  );
}

/** Sections used by the storefront nav — top-level lines, in the owner's order. */
export function navCategories(limit = 8): CategoryRow[] {
  return listCategories()
    .filter((c) => c.parent_id === null)
    .slice(0, limit);
}

export function categoryBySlug(slug: string, { includeInactive = false } = {}) {
  return get<CategoryRow>(
    `SELECT c.id, c.name, c.slug, c.blurb, c.image, c.sort, c.is_active, c.parent_id,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'published') AS count,
            (SELECT MIN(p.price) FROM products p WHERE p.category_id = c.id AND p.status = 'published') AS priceFrom
       FROM categories c WHERE c.slug = ?${includeInactive ? "" : " AND c.is_active = 1"}`,
    slug,
  );
}

export function childCategories(parentId: number) {
  return all<CategoryRow>(
    `SELECT c.id, c.name, c.slug, c.blurb, c.image, c.sort, c.is_active, c.parent_id,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'published') AS count,
            NULL AS priceFrom
       FROM categories c WHERE c.parent_id = ? ORDER BY c.sort, c.name`,
    parentId,
  );
}

/** Tiles for the home page: category with the most products first, never empty. */
export function featuredTiles(limit = 6) {
  const rows = listCategories().filter((c) => c.count > 0);
  const picked: CategoryRow[] = [];
  const seen = new Set<string>();
  // One tile per top-level line so the rail reads as a shop, not as a repeat.
  for (const row of rows) {
    const root = row.parent_id ? (get<{ name: string }>(`SELECT name FROM categories WHERE id = ?`, row.parent_id)?.name ?? row.name) : row.name;
    if (seen.has(root)) continue;
    seen.add(root);
    picked.push(row);
    if (picked.length >= limit) break;
  }
  if (picked.length < limit) {
    for (const row of rows) {
      if (picked.includes(row)) continue;
      picked.push(row);
      if (picked.length >= limit) break;
    }
  }
  return picked;
}

export function createCategory(input: { name: string; blurb?: string; image?: string; parentId?: number | null; sort?: number }) {
  return tx(() => {
    let slug = slugify(input.name) || `category-${Date.now()}`;
    let n = 2;
    while (get<{ id: number }>(`SELECT id FROM categories WHERE slug = ?`, slug)) slug = `${slugify(input.name)}-${n++}`;
    return insert(
      `INSERT INTO categories (name, slug, blurb, image, parent_id, sort, is_active) VALUES (?,?,?,?,?,?,1)`,
      input.name.trim().slice(0, 60),
      slug,
      input.blurb?.slice(0, 240) || null,
      input.parentId ?? null,
      input.sort ?? 100,
    );
  });
}

export function updateCategory(
  id: number,
  input: { name?: string; blurb?: string; image?: string; parentId?: number | null; sort?: number; isActive?: boolean },
) {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  const add = (column: string, value: string | number | null) => {
    sets.push(`${column} = ?`);
    params.push(value);
  };
  if (input.name) {
    add("name", input.name.trim().slice(0, 60));
    let slug = slugify(input.name);
    let n = 2;
    while (get<{ id: number }>(`SELECT id FROM categories WHERE slug = ? AND id <> ?`, slug, id)) slug = `${slugify(input.name)}-${n++}`;
    add("slug", slug);
  }
  if (input.blurb !== undefined) add("blurb", input.blurb?.slice(0, 240) || null);
  if (input.image !== undefined) add("image", input.image?.slice(0, 400) || null);
  if (input.parentId !== undefined) add("parent_id", input.parentId);
  if (input.sort !== undefined) add("sort", input.sort);
  if (input.isActive !== undefined) add("is_active", input.isActive ? 1 : 0);
  if (!sets.length) return 0;
  return run(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`, ...params, id).changes;
}

export function deleteCategory(id: number) {
  return tx(() => {
    run(`UPDATE products SET category_id = NULL WHERE category_id = ?`, id);
    run(`UPDATE categories SET parent_id = NULL WHERE parent_id = ?`, id);
    return run(`DELETE FROM categories WHERE id = ?`, id).changes;
  });
}
