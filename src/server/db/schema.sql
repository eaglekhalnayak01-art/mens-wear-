-- ===========================================================================
--  Mens Wear — relational schema (SQLite / node:sqlite)
--  Portable SQL: the same DDL maps 1:1 onto Postgres/MySQL later.
--  Money is stored in paise-free decimal INR (REAL) at the shop's scale;
--  swap to INTEGER paisa when a payment gateway needs exact minor units.
-- ===========================================================================

PRAGMA foreign_keys = ON;

-- --- Store configuration (owner-editable, no migrations needed) ------------
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  type        TEXT NOT NULL DEFAULT 'string' CHECK (type IN ('string','number','boolean','json')),
  label       TEXT,
  grp         TEXT,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- --- Taxonomy --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY,
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  blurb       TEXT,
  image       TEXT,
  sort        INTEGER NOT NULL DEFAULT 100,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

-- --- Catalogue -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                  INTEGER PRIMARY KEY,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  sub_category        TEXT,
  brand               TEXT,
  description         TEXT,
  fabric              TEXT,          -- material / composition shown on the PDP
  care                TEXT,          -- care instructions
  -- Which payment modes this style accepts. A made-to-measure or discounted piece
  -- can be prepaid-only; a heavy coat can be cash-only. Enforced in the quote.
  payment_mode        TEXT NOT NULL DEFAULT 'both' CHECK (payment_mode IN ('both','cod','online')),
  delivery_days       INTEGER,       -- per-style dispatch promise, else the shop-wide one
  price               REAL NOT NULL CHECK (price >= 0),
  compare_at_price    REAL,          -- MRP / original price
  sku                 TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'published'
                        CHECK (status IN ('published','hidden','draft')),
  is_featured         INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
  is_new_arrival      INTEGER NOT NULL DEFAULT 0 CHECK (is_new_arrival IN (0,1)),
  is_bestseller       INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 6,
  sold_qty            INTEGER NOT NULL DEFAULT 0,
  rating              REAL,          -- optional, populated when reviews ship
  rating_count        INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  published_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status   ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_flags    ON products(is_new_arrival, is_bestseller, is_featured);
CREATE INDEX IF NOT EXISTS idx_products_created  ON products(created_at DESC);

CREATE TABLE IF NOT EXISTS product_images (
  id          INTEGER PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  src         TEXT NOT NULL,          -- /images/… (seeded) or /api/media/… (uploaded)
  alt         TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  is_primary  INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_product_images_prod ON product_images(product_id, sort);

-- Master lists make the owner's size/colour pickers consistent across products.
CREATE TABLE IF NOT EXISTS sizes (
  id     INTEGER PRIMARY KEY,
  label  TEXT NOT NULL UNIQUE,
  sort   INTEGER NOT NULL DEFAULT 100
);
CREATE TABLE IF NOT EXISTS colors (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  hex   TEXT
);
CREATE TABLE IF NOT EXISTS product_sizes (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_id    INTEGER NOT NULL REFERENCES sizes(id)     ON DELETE CASCADE,
  sort       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, size_id)
);
CREATE TABLE IF NOT EXISTS product_colors (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_id   INTEGER NOT NULL REFERENCES colors(id)   ON DELETE CASCADE,
  sort       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, color_id)
);

-- One row per purchasable size+colour combination; stock lives here.
CREATE TABLE IF NOT EXISTS product_variants (
  id           INTEGER PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_id      INTEGER REFERENCES sizes(id)  ON DELETE CASCADE,
  color_id     INTEGER REFERENCES colors(id) ON DELETE CASCADE,
  sku          TEXT UNIQUE,
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price        REAL,                     -- optional override, else product price
  is_active    INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- --- People ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id            INTEGER PRIMARY KEY,
  mobile        TEXT NOT NULL UNIQUE,
  name          TEXT,
  email         TEXT,
  password_hash TEXT,                     -- nullable: OTP-first, password optional
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,   -- set after repeated wrong passwords; see adminLogin
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id           INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label        TEXT,
  recipient    TEXT,
  phone        TEXT,
  line1        TEXT NOT NULL,
  line2        TEXT,
  city         TEXT NOT NULL,
  state        TEXT NOT NULL,
  pin          TEXT NOT NULL,
  landmark     TEXT,
  is_default   INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON customer_addresses(customer_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','staff')),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,   -- set after repeated wrong passwords; see adminLogin
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_login_at TEXT
);

-- --- Sessions & OTP (server-side only; tokens are stored hashed) -----------
CREATE TABLE IF NOT EXISTS auth_sessions (
  id           INTEGER PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('customer','admin')),
  subject_id   INTEGER NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  user_agent   TEXT,
  ip           TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at   TEXT NOT NULL,
  revoked_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_lookup ON auth_sessions(token_hash, revoked_at);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id          INTEGER PRIMARY KEY,
  mobile      TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  purpose     TEXT NOT NULL DEFAULT 'login',
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_challenges(mobile, created_at DESC);

-- --- Orders -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                    INTEGER PRIMARY KEY,
  public_ref            TEXT NOT NULL UNIQUE,   -- MW-2026-4F7K2  (also the track link)
  customer_id           INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  guest_name            TEXT NOT NULL,
  guest_mobile          TEXT NOT NULL,
  guest_email           TEXT,
  address_line1         TEXT NOT NULL,
  address_line2         TEXT,
  city                  TEXT NOT NULL,
  state                 TEXT NOT NULL,
  pin                   TEXT NOT NULL,
  landmark              TEXT,
  subtotal              REAL NOT NULL DEFAULT 0,
  discount              REAL NOT NULL DEFAULT 0,
  shipping              REAL NOT NULL DEFAULT 0,
  cod_fee               REAL NOT NULL DEFAULT 0,
  total                 REAL NOT NULL DEFAULT 0,
  payment_method        TEXT NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod','online')),
  payment_status        TEXT NOT NULL DEFAULT 'pending'
                          CHECK (payment_status IN ('pending','paid','failed','refunded')),
  status                TEXT NOT NULL DEFAULT 'placed'
                          CHECK (status IN ('placed','confirmed','processing','packed',
                                            'shipped','out_for_delivery','delivered','cancelled')),
  notes                 TEXT,
  cancelled_reason      TEXT,
  placed_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expected_delivery_at  TEXT,
  delivered_at          TEXT,
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_mobile ON orders(guest_mobile);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_placed ON orders(placed_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  variant_id   INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,      -- snapshots survive product edits/deletion
  size         TEXT,
  color        TEXT,
  unit_price   REAL NOT NULL,
  qty          INTEGER NOT NULL CHECK (qty > 0),
  line_total   REAL NOT NULL,
  image        TEXT,
  sku          TEXT
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- One row per status change → customer timeline + admin history + webhooks.
CREATE TABLE IF NOT EXISTS order_events (
  id          INTEGER PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  note        TEXT,
  actor_type  TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('system','admin','customer')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_order_events ON order_events(order_id, id);

CREATE TABLE IF NOT EXISTS payments (
  id          INTEGER PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL DEFAULT 'cod',   -- cod | razorpay | upi …
  intent_id   TEXT,
  amount      REAL NOT NULL,
  status      TEXT NOT NULL DEFAULT 'created'
                CHECK (status IN ('created','authorized','captured','failed','refunded')),
  raw_json    TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- Stock ledger: makes sold-quantity, restock history and audits real.
CREATE TABLE IF NOT EXISTS stock_movements (
  id          INTEGER PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  INTEGER REFERENCES product_variants(id) ON DELETE CASCADE,
  delta       INTEGER NOT NULL,
  reason      TEXT NOT NULL,      -- order | cancel | restock | adjustment | seed
  order_id    INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id, created_at DESC);

-- Search: name / category / brand / SKU all funnel through this expression.
CREATE VIEW IF NOT EXISTS product_search AS
SELECT p.id,
       p.name || ' ' || COALESCE(p.brand,'') || ' ' || COALESCE(p.sku,'') || ' ' ||
       COALESCE(c.name,'') || ' ' || COALESCE(p.sub_category,'') AS haystack
FROM products p LEFT JOIN categories c ON c.id = p.category_id;

-- Live availability roll-up used by shop filters, PDP and inventory screen.
CREATE VIEW IF NOT EXISTS product_availability AS
SELECT p.id AS product_id,
       COALESCE(SUM(v.stock),0) AS stock,
       COUNT(v.id)              AS variant_count,
       COALESCE(SUM(CASE WHEN v.stock = 0 THEN 1 ELSE 0 END),0) AS out_variants
FROM products p
LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_active = 1
GROUP BY p.id;

-- Contact-form messages. Kept small on purpose: this is an inbox, not a CRM.
-- --- Owner alerts ----------------------------------------------------------
-- Every order event that should reach the shop owner lands here first: the
-- dashboard bell reads this table, and the webhook/SMS sender drains it. Keeping
-- the row means a notification is never the only copy of the fact.
CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY,
  event       TEXT NOT NULL,               -- order:placed | order:cancelled | …
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'inbox',  -- inbox | webhook | whatsapp | email
  target      TEXT,
  order_ref   TEXT,
  sent_at     TEXT,
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read   ON notifications(read_at);

CREATE TABLE IF NOT EXISTS enquiries (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  mobile      TEXT NOT NULL,
  email       TEXT,
  topic       TEXT NOT NULL DEFAULT 'other',
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','replied','closed')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status, created_at DESC);
