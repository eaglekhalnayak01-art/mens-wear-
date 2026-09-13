/**
 * Seeds a complete, believable shop: categories, the catalogue with per-size
 * stock, store settings, an owner login, plus ten customers and twenty orders
 * spread over the last month so the dashboard has something honest to show.
 *
 *   node scripts/seed.mjs            # seed when the DB is empty
 *   node scripts/seed.mjs --fresh    # wipe data and reseed
 *   node scripts/seed.mjs --catalogue-only
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  categories,
  colorLibrary,
  demoAddresses,
  demoCustomers,
  demoOrderPlans,
  products,
  storeProfile,
  stockFor,
} from "./catalog.data.mjs";
import { buildImages } from "./build-images.mjs";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv(); // DATABASE_PATH, ADMIN_EMAIL, ADMIN_PASSWORD from .env.local

const ROOT = process.cwd();
const file = path.resolve(ROOT, process.env.DATABASE_PATH || "./data/app.db");
const schemaPath = path.join(ROOT, "src", "server", "db", "schema.sql");
const FRESH = process.argv.includes("--fresh");
const CATALOGUE_ONLY = process.argv.includes("--catalogue-only");

const iso = (d) => new Date(d).toISOString();
const daysAgo = (n) => iso(Date.now() - n * 86400_000);

function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 });
  return ["scrypt", 16384, 8, 1, salt.toString("base64"), derived.toString("base64")].join("$");
}

// --------------------------------------------------------------------- bootstrap
if (FRESH && fs.existsSync(file)) {
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(file + suffix, { force: true });
}
fs.mkdirSync(path.dirname(file), { recursive: true });

const db = new DatabaseSync(file);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec(fs.readFileSync(schemaPath, "utf8"));

const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
const existingProducts = count("products");

if (existingProducts > 0 && !FRESH && !CATALOGUE_ONLY) {
  console.log(`Database already has ${existingProducts} products.`);
  console.log("Skipping seed. Use `node scripts/seed.mjs --fresh` to wipe and reseed.");
  db.close();
  process.exit(0);
}

console.log("Building product imagery from the lookbook shoot…");
const imageReport = await buildImages({ force: FRESH, quiet: true });

// ------------------------------------------------------------------------ settings
const settingsToWrite = {
  shopName: storeProfile.shopName,
  tagline: storeProfile.tagline,
  phone: storeProfile.phone,
  whatsapp: storeProfile.whatsapp,
  email: storeProfile.email,
  addressLine1: storeProfile.addressLine1,
  addressLine2: storeProfile.addressLine2,
  city: storeProfile.city,
  state: storeProfile.state,
  pin: storeProfile.pin,
  hours: storeProfile.hours,
  instagram: storeProfile.instagram,
  facebook: storeProfile.facebook,
  announcement: storeProfile.announcement,
  deliveryFee: 79,
  freeDeliveryOver: 1999,
  minOrderValue: 499,
  codFee: 0,
  codEnabled: true,
  onlineEnabled: true,
  // A shop with no gateway account still takes advance payment: its own UPI id + QR.
  onlineMode: "qr",
  upiId: "menswear@okhdfcbank",
  upiPayeeName: storeProfile.shopName,
  paymentInstructions: "Pay the exact total in one go. We confirm on WhatsApp within an hour, and pack the same evening.",
  utrRequired: false,
  notifyOrderEnabled: true,
  notifyMobile: storeProfile.whatsapp,
  dispatchDays: 2,
  deliveryDaysMin: 3,
  deliveryDaysMax: 6,
  returnWindowDays: 7,
  whatsappEnabled: true,
  announcementEnabled: true,
  gstNumber: "24ABCDE1135F1Z5",
  gstState: "Gujarat",
  logoText: "M",
  whatsappGreeting: storeProfile.whatsappGreeting,
};
const writeSetting = db.prepare(
  `INSERT INTO settings (key, value, type, updated_at) VALUES (?,?,?,?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value, type = excluded.type, updated_at = excluded.updated_at`,
);
db.exec("BEGIN");
for (const [key, value] of Object.entries(settingsToWrite)) {
  const type = typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string";
  writeSetting.run(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value), type, iso(Date.now()));
}
db.exec("COMMIT");

// ---------------------------------------------------------------------- categories
const insertCategory = db.prepare(
  `INSERT INTO categories (name, slug, blurb, image, sort, is_active) VALUES (?,?,?,?,?,1)
   ON CONFLICT(slug) DO UPDATE SET name=excluded.name, blurb=excluded.blurb, image=excluded.image, sort=excluded.sort
   RETURNING id`,
);
const categoryIds = new Map();
db.exec("BEGIN");
categories.forEach((category, index) => {
  const row = insertCategory
    .get(category.name, category.slug, category.blurb ?? null, category.image ?? null, (index + 1) * 10)
    ?.valueOf?.();
  const id = db.prepare(`SELECT id FROM categories WHERE slug = ?`).get(category.slug).id;
  categoryIds.set(category.slug, id);
  void row;
});
db.exec("COMMIT");

// ------------------------------------------------- sizes + colours (master lists)
const sizeSort = (label) => {
  const order = ["2XS", "XS", "S", "M", "L", "XL", "XXL", "Free", "Onesize"];
  const idx = order.findIndex((s) => s.toLowerCase() === label.toLowerCase());
  if (idx >= 0) return idx;
  const n = Number(label.replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? 200 + n : 900;
};
const ensureSize = (label) => {
  const found = db.prepare(`SELECT id FROM sizes WHERE lower(label) = lower(?)`).get(label);
  if (found) return found.id;
  const info = db.prepare(`INSERT INTO sizes (label, sort) VALUES (?,?)`).run(label, sizeSort(label));
  return Number(info.lastInsertRowid);
};
const ensureColor = (name, hex) => {
  const found = db.prepare(`SELECT id FROM colors WHERE lower(name) = lower(?)`).get(name);
  if (found) return found.id;
  const info = db.prepare(`INSERT INTO colors (name, hex) VALUES (?,?)`).run(name, hex);
  return Number(info.lastInsertRowid);
};
for (const color of colorLibrary) ensureColor(color.name, color.hex);
const colorHex = new Map(colorLibrary.map((c) => [c.name, c.hex]));

// ----------------------------------------------------------------------- products
if (FRESH || CATALOGUE_ONLY) {
  db.exec(`DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products)`);
  db.exec(`DELETE FROM product_images WHERE product_id IN (SELECT id FROM products)`);
  db.exec(`DELETE FROM product_sizes WHERE product_id IN (SELECT id FROM products)`);
  db.exec(`DELETE FROM product_colors WHERE product_id IN (SELECT id FROM products)`);
  db.exec(`DELETE FROM stock_movements`);
  db.exec(`DELETE FROM order_items`);
  db.exec(`DELETE FROM order_events`);
  db.exec(`DELETE FROM payments`);
  db.exec(`DELETE FROM orders`);
  db.exec(`DELETE FROM products`);
}

const insertProduct = db.prepare(
  `INSERT INTO products
     (name, slug, category_id, sub_category, brand, description, fabric, care, price, compare_at_price,
      sku, status, is_featured, is_new_arrival, is_bestseller, low_stock_threshold, sold_qty,
      rating, rating_count, payment_mode, delivery_days, created_at, updated_at, published_at)
   VALUES (@name,@slug,@category_id,@sub_category,@brand,@description,@fabric,@care,@price,@compare_at_price,
           @sku,'published',@is_featured,@is_new_arrival,@is_bestseller,@low_stock_threshold,@sold_qty,
           @rating,@rating_count,@payment_mode,@delivery_days,@created_at,@created_at,@created_at)`,
);

const productRowIds = new Map();
let variantTotal = 0;
let imageTotal = 0;

db.exec("BEGIN");
products.forEach((product, index) => {
  const created = daysAgo(Math.max(1, 46 - index * 1.15));
  const slug = product.slug;
  const sold = 6 + ((index * 37) % 92);
  const info = insertProduct.run({
    name: product.name,
    slug,
    category_id: categoryIds.get(product.category) ?? null,
    sub_category: product.sub ?? null,
    brand: product.brand ?? null,
    description: product.description ?? null,
    fabric: product.fabric ?? null,
    care: product.care ?? null,
    price: product.price,
    compare_at_price: product.mrp ?? null,
    sku: `AMW-${String(1000 + index)}`,
    is_featured: product.featured ? 1 : 0,
    is_new_arrival: product.isNew ? 1 : 0,
    is_bestseller: product.bestseller ? 1 : 0,
    low_stock_threshold: product.lowStock ?? 6,
    sold_qty: sold,
    payment_mode: product.pay === "cod" || product.pay === "online" ? product.pay : "both",
    delivery_days: product.days ?? null,
    rating: product.rating ?? (4.1 + ((index * 7) % 9) / 10),
    rating_count: product.ratingCount ?? 4 + ((index * 13) % 46),
    created_at: created,
  });
  const productId = Number(info.lastInsertRowid);
  productRowIds.set(slug, productId);

  // images produced by build-images (primary first, then gallery crops)
  const built = imageReport.byProduct?.[slug] ?? [];
  const usable = built.filter((entry) => entry && !entry.missing);
  const images = usable.length ? usable : [{ src: `/api/placeholder/${encodeURIComponent(slug)}.svg`, alt: product.name }];
  images.forEach((entry, i) => {
    db.prepare(`INSERT INTO product_images (product_id, src, alt, sort, is_primary) VALUES (?,?,?,?,?)`).run(
      productId,
      entry.src,
      entry.alt ?? product.name,
      i,
      i === 0 ? 1 : 0,
    );
    imageTotal += 1;
  });

  // sizes + colours
  const sizeIds = (product.sizes ?? ["M", "L", "XL"]).map(ensureSize);
  sizeIds.forEach((sizeId, i) =>
    db.prepare(`INSERT OR IGNORE INTO product_sizes (product_id, size_id, sort) VALUES (?,?,?)`).run(productId, sizeId, i),
  );
  const colors = (product.colors ?? ["Midnight"]).map((name) => ({ id: ensureColor(name, colorHex.get(name) ?? "#7c7c7c"), name }));
  colors.forEach((color, i) =>
    db.prepare(`INSERT OR IGNORE INTO product_colors (product_id, color_id, sort) VALUES (?,?,?)`).run(productId, color.id, i),
  );

  // stock grid: one variant per size × colour the shop really carries
  const sizeLabels = product.sizes ?? ["M", "L", "XL"];
  sizeLabels.forEach((sizeLabel, sIndex) => {
    const sizeId = ensureSize(sizeLabel);
    colors.forEach((color, cIndex) => {
      const stock = stockFor(index, sIndex, cIndex, sizeLabels.length);
      const vInfo = db
        .prepare(
          `INSERT INTO product_variants (product_id, size_id, color_id, sku, stock, is_active)
           VALUES (?,?,?,?,?,1)`,
        )
        .run(productId, sizeId, color.id, `AMW-${1000 + index}-${sizeLabel}-${color.name.slice(0, 3).toUpperCase()}`, stock);
      variantTotal += 1;
      db.prepare(`UPDATE product_variants SET sku = ? WHERE id = ?`).run(
        `AMW-${1000 + index}-${sizeLabel}-${color.name.slice(0, 3).toUpperCase()}-${Number(vInfo.lastInsertRowid)}`,
        Number(vInfo.lastInsertRowid),
      );
    });
  });
});
db.exec("COMMIT");

// ------------------------------------------------------------------- owner account
// The owner login is never hardcoded. Give it in .env.local (ADMIN_EMAIL /
// ADMIN_PASSWORD / ADMIN_NAME); without a password this generates one and prints it
// once, in the terminal — the only place it ever exists.
const adminEmail = (process.env.ADMIN_EMAIL || "owner@menswear.local").toLowerCase();
const adminName = process.env.ADMIN_NAME || "Owner";
const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");

if (!db.prepare(`SELECT id FROM admin_users WHERE lower(email) = lower(?)`).get(adminEmail)) {
  db.prepare(`INSERT INTO admin_users (name, email, password_hash, role, created_at) VALUES (?,?,?,?,?)`).run(
    adminName,
    adminEmail,
    hashPassword(adminPassword),
    "owner",
    daysAgo(420),
  );
  console.log(
    "\n  Owner dashboard login\n" +
      `  \u251C\u2500 email     ${adminEmail}\n` +
      `  \u2514\u2500 password  ${process.env.ADMIN_PASSWORD ? "(from ADMIN_PASSWORD in your environment)" : adminPassword + "   \u2190 printed once, save it now"}\n` +
      "\n  Change it any time with: npm run admin:set\n",
  );
} else {
  console.log(`\n  Owner login already exists for ${adminEmail} — left as it is.\n`);
}

// ------------------------------------------------ customers + addresses + orders
if (!CATALOGUE_ONLY) {
  db.exec(`DELETE FROM order_items`);
  db.exec(`DELETE FROM order_events`);
  db.exec(`DELETE FROM payments`);
  db.exec(`DELETE FROM orders`);
  db.exec(`DELETE FROM customer_addresses`);
  db.exec(`DELETE FROM customers`);

  const customerIds = [];
  db.exec("BEGIN");
  demoCustomers.forEach((customer, i) => {
    const info = db
      .prepare(
        `INSERT INTO customers (mobile, name, email, password_hash, created_at, last_login_at)
         VALUES (?,?,?,?,?,?)`,
      )
      .run(
        customer.mobile,
        customer.name,
        customer.email || null,
        null, // customers sign in with a one-time code only: there is no password to steal
        daysAgo(120 - i * 6),
        daysAgo(i % 9),
      );
    customerIds.push(Number(info.lastInsertRowid));

    const address = demoAddresses[i % demoAddresses.length];
    db.prepare(
      `INSERT INTO customer_addresses
        (customer_id, label, recipient, phone, line1, line2, city, state, pin, is_default)
       VALUES (?,?,?,?,?,?,?,?,?,1)`,
    ).run(Number(info.lastInsertRowid), i % 2 === 0 ? "Home" : "Office", customer.name, customer.mobile, address.line1, address.line2, address.city, address.state, address.pin);
  });
  db.exec("COMMIT");

  const STATUS_PATH = ["placed", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"];
  let orderCount = 0;

  db.exec("BEGIN");
  for (const plan of demoOrderPlans) {
    const productIndex = plan.lines.map((line) => line[0]);
    const customerId = customerIds[plan.customer % customerIds.length];
    const customerRow = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(customerId);
    const address = db.prepare(`SELECT * FROM customer_addresses WHERE customer_id = ? LIMIT 1`).get(customerId);
    const placedAt = iso(Date.now() - plan.dayOffset * 86400_000 + (plan.hours - 12) * 3600_000);

    let subtotal = 0;
    let mrpTotal = 0;
    const lines = [];
    for (const [pIndex, size, colorName, qty] of plan.lines) {
      const product = products[pIndex];
      if (!product) continue;
      const productId = productRowIds.get(product.slug);
      const variant = db
        .prepare(
          `SELECT v.id, v.sku, s.label AS size, c.name AS color,
                  (SELECT src FROM product_images pi WHERE pi.product_id = v.product_id ORDER BY pi.is_primary DESC, pi.sort LIMIT 1) AS image
             FROM product_variants v
             LEFT JOIN sizes s ON s.id = v.size_id
             LEFT JOIN colors c ON c.id = v.color_id
            WHERE v.product_id = ? ORDER BY (s.label = ?) DESC, (c.name = ?) DESC LIMIT 1`,
        )
        .get(productId, size, colorName);
      subtotal += product.price * qty;
      mrpTotal += (product.mrp ?? product.price) * qty;
      lines.push({ product, productId, variant, qty });
    }
    if (!lines.length) continue;

    const shipping = subtotal >= 1999 ? 0 : 79;
    const total = subtotal + shipping;
    const ref = `AMW-${new Date(placedAt).getFullYear()}-${String(1000 + orderCount + ((plan.dayOffset * 7) % 900)).slice(-4)}${"ABCDEFGHJKLMNPQRSTUVWXYZ"[orderCount % 24]}${(plan.dayOffset * 3 + 1) % 9}`;
    const paymentStatus = plan.payment === "online" ? "paid" : plan.status === "delivered" ? "paid" : "pending";
    const progress = plan.status === "cancelled" ? 1 : STATUS_PATH.indexOf(plan.status);
    const expected = iso(new Date(placedAt).getTime() + 6 * 86400_000);

    const orderInfo = db
      .prepare(
        `INSERT INTO orders
          (public_ref, customer_id, guest_name, guest_mobile, guest_email,
           address_line1, address_line2, city, state, pin,
           subtotal, discount, shipping, cod_fee, total,
           payment_method, payment_status, status, placed_at, expected_delivery_at, delivered_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        ref,
        customerId,
        customerRow.name,
        customerRow.mobile,
        customerRow.email,
        address.line1,
        address.line2,
        address.city,
        address.state,
        address.pin,
        subtotal,
        mrpTotal - subtotal,
        shipping,
        0,
        total,
        plan.payment,
        paymentStatus,
        plan.status,
        placedAt,
        expected,
        plan.status === "delivered" ? iso(new Date(placedAt).getTime() + 4 * 86400_000) : null,
        placedAt,
      );
    const orderId = Number(orderInfo.lastInsertRowid);

    for (const line of lines) {
      db.prepare(
        `INSERT INTO order_items
          (order_id, product_id, variant_id, name, size, color, unit_price, qty, line_total, image, sku)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        orderId,
        line.productId,
        line.variant?.id ?? null,
        line.product.name,
        line.variant?.size ?? line[1],
        line.variant?.color ?? null,
        line.product.price,
        line.qty,
        line.product.price * line.qty,
        line.variant?.image ?? `/api/placeholder/${line.product.slug}.svg`,
        `AMW-${1000 + products.indexOf(line.product)}`,
      );
    }

    db.prepare(`INSERT INTO payments (order_id, provider, amount, status, created_at) VALUES (?,?,?,?,?)`).run(
      orderId,
      plan.payment === "cod" ? "cod" : "razorpay",
      total,
      paymentStatus === "paid" ? "captured" : "created",
      placedAt,
    );

    const trail = plan.status === "cancelled" ? ["placed", "cancelled"] : STATUS_PATH.slice(0, progress + 1);
    trail.forEach((status, i) => {
      db.prepare(`INSERT INTO order_events (order_id, status, note, actor_type, created_at) VALUES (?,?,?,?,?)`).run(
        orderId,
        status,
        status === "placed"
          ? "Order received by Mens Wear." 
          : status === "cancelled"
            ? "Cancelled at the customer's request."
            : status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ") + ".",
        i === 0 ? "customer" : "admin",
        iso(new Date(placedAt).getTime() + i * 9 * 3600_000),
      );
    });

    orderCount += 1;
  }
  db.exec("COMMIT");
  console.log(`Seeded ${orderCount} demo orders across ${customerIds.length} customers.`);
}

// ------------------------------------------------------------------------- summary
const summary = {
  products: count("products"),
  variants: count("product_variants"),
  images: count("product_images"),
  categories: count("categories"),
  customers: count("customers"),
  orders: count("orders"),
};
console.log("\nSeed complete:", summary);
console.log(`  image files: ${imageReport.written} written, ${imageReport.skipped} reused`);
console.log(`\nOwner login → /admin/login`);
console.log(`  email    ${adminEmail}`);
console.log(`  password ${adminPassword}`);
console.log(`\nCustomer login → /account/login  (any 10-digit number, OTP is printed in the terminal)`);
db.close();
