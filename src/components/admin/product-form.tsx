"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { IconAlert, IconArrowUpRight, IconCheck, IconChevronDown } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { ImageManager, type ManagedImage } from "@/components/admin/image-manager";
import { VariantEditor, type ProductColor, type ProductStockCell } from "@/components/admin/variant-editor";
import { api, ApiError } from "@/lib/client-api";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";

export type ProductFormInitial = {
  id?: number;
  name: string;
  slug: string;
  brand: string;
  categoryId: number | null;
  subCategory: string;
  description: string;
  fabric: string;
  care: string;
  price: number;
  compareAtPrice: number | null;
  sku: string;
  status: "published" | "hidden" | "draft";
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestseller: boolean;
  lowStockThreshold: number;
  sizes: string[];
  colors: ProductColor[];
  stock: ProductStockCell[];
  images: ManagedImage[];
};

/**
 * One form for creating and editing. Sections run top to bottom in the order the
 * owner actually works: what is it, say something true about it, what does it cost,
 * pictures, sizes and counts, then whether the shop shows it.
 */
export function ProductForm({
  initial,
  categories,
}: {
  initial: ProductFormInitial;
  categories: { id: number; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const editing = typeof initial.id === "number";

  const [values, setValues] = useState({
    name: initial.name,
    slug: initial.slug,
    brand: initial.brand,
    subCategory: initial.subCategory,
    description: initial.description,
    fabric: initial.fabric,
    care: initial.care,
    price: String(initial.price || ""),
    compareAtPrice: initial.compareAtPrice ? String(initial.compareAtPrice) : "",
    sku: initial.sku,
    status: initial.status,
    lowStockThreshold: String(initial.lowStockThreshold),
  });
  const [categoryId, setCategoryId] = useState<number | null>(initial.categoryId);
  const [flags, setFlags] = useState({ isFeatured: initial.isFeatured, isNewArrival: initial.isNewArrival, isBestseller: initial.isBestseller });
  const [media, setMedia] = useState<ManagedImage[]>(initial.images);
  const [variants, setVariants] = useState({ sizes: initial.sizes, colors: initial.colors, stock: initial.stock });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(!initial.slug || !initial.sku);

  const totalStock = useMemo(
    () => variants.stock.reduce((sum, entry) => sum + (entry.stock || 0), 0),
    [variants.stock],
  );
  const previewDiscount = useMemo(() => {
    const price = Number(values.price);
    const compare = Number(values.compareAtPrice);
    if (!compare || !price || compare <= price) return 0;
    return Math.round(((compare - price) / compare) * 100);
  }, [values.price, values.compareAtPrice]);

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);

    const local: Record<string, string> = {};
    if (values.name.trim().length < 3) local.name = "Give the piece a real name — customers search on it.";
    if (!Number(values.price) || Number(values.price) < 1) local.price = "Selling price must be ₹1 or more.";
    if (values.compareAtPrice && Number(values.compareAtPrice) <= Number(values.price)) {
      local.compareAtPrice = "The strikethrough price has to be higher than the selling price.";
    }
    if (variants.sizes.length === 0) local.sizes = "At least one size, even if it is “Free”.";
    if (variants.colors.length === 0) local.colors = "At least one colour name.";
    if (media.length === 0) local.images = "Add at least one photo — a product with no picture cannot sell.";
    setErrors(local);
    if (Object.keys(local).length > 0) {
      document.getElementById("admin-main")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const body = {
      name: values.name.trim(),
      slug: values.slug.trim() || undefined,
      categoryId,
      subCategory: values.subCategory.trim(),
      brand: values.brand.trim(),
      description: values.description.trim(),
      fabric: values.fabric.trim(),
      care: values.care.trim(),
      price: Number(values.price),
      compareAtPrice: values.compareAtPrice ? Number(values.compareAtPrice) : null,
      sku: values.sku.trim(),
      status: values.status,
      isFeatured: flags.isFeatured,
      isNewArrival: flags.isNewArrival,
      isBestseller: flags.isBestseller,
      lowStockThreshold: Number(values.lowStockThreshold) || 0,
      sizes: variants.sizes,
      colors: variants.colors,
      variants: variants.stock.length > 0 ? variants.stock : variants.sizes.flatMap((size) => variants.colors.map((color) => ({ size, color: color.name, stock: 0 }))),
      images: media,
    };

    setBusy(true);
    try {
      if (editing) {
        await api.put(`/api/admin/products/${initial.id}`, body);
        toast.push({ title: "Saved", description: `${body.name} is up to date.`, tone: "good" });
        router.refresh();
      } else {
        const created = await api.post<{ ok: boolean; id: number }>("/api/admin/products", body);
        toast.push({ title: "Product created", description: "You can fine-tune the stock grid any time.", tone: "good" });
        router.replace(`/admin/products/${created.id}`);
      }
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fields ?? {});
        setServerError(caught.message);
      } else {
        setServerError("We could not reach the shop. Nothing was lost — try again in a moment.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Section title="The basics" hint="Name, category and where it belongs.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product name" required error={errors.name} htmlFor="p-name" className="sm:col-span-2">
            <Input id="p-name" value={values.name} onChange={(event) => set("name", event.target.value)} invalid={Boolean(errors.name)} placeholder="Kantha-stitched bandhgala jacket" />
          </Field>
          <Field label="Category" htmlFor="p-category" hint="Decides which collection page it lands on.">
            <Select id="p-category" value={categoryId ?? ""} onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : null)}>
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sub-category" optionalLabel htmlFor="p-sub" error={errors.subCategory}>
            <Input id="p-sub" value={values.subCategory} onChange={(event) => set("subCategory", event.target.value)} invalid={Boolean(errors.subCategory)} placeholder="Ethnic wear" />
          </Field>
          <Field label="Brand" optionalLabel htmlFor="p-brand" error={errors.brand} hint="Your in-house label is fine.">
            <Input id="p-brand" value={values.brand} onChange={(event) => set("brand", event.target.value)} invalid={Boolean(errors.brand)} placeholder="Aakash Signature" />
          </Field>
          <Field label="SKU" optionalLabel htmlFor="p-sku" error={errors.sku} hint="Left blank, we build one from the category and name.">
            <Input id="p-sku" value={values.sku} onChange={(event) => set("sku", event.target.value)} invalid={Boolean(errors.sku)} placeholder="AMW-BAN-01" />
          </Field>
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className="text-[12px] text-muted underline decoration-line underline-offset-4 hover:text-ink sm:col-span-2"
            aria-expanded={moreOpen}
          >
            {moreOpen ? "Hide address-bar options" : "Change the web address (slug)"}
            <IconChevronDown size={11} className={cn("ml-1 inline-block transition-transform", moreOpen && "rotate-180")} />
          </button>
          {moreOpen ? (
            <Field
              label="Web address"
              htmlFor="p-slug"
              className="sm:col-span-2"
              error={errors.slug}
              hint={editing ? "Changing this breaks old links — only do it if you must." : "Left blank, we make one from the name."}
            >
              <Input id="p-slug" value={values.slug} onChange={(event) => set("slug", event.target.value)} invalid={Boolean(errors.slug)} placeholder="kantha-bandhgala-jacket" />
            </Field>
          ) : null}
        </div>
      </Section>

      <Section title="Price" hint="What the customer pays, and what it is crossed out against.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Selling price" required htmlFor="p-price" error={errors.price}>
            <Input id="p-price" inputMode="numeric" value={values.price} onChange={(event) => set("price", event.target.value.replace(/[^\d.]/g, ""))} invalid={Boolean(errors.price)} prefix="₹" placeholder="3495" />
          </Field>
          <Field label="Compare-at price" optionalLabel htmlFor="p-compare" error={errors.compareAtPrice} hint="The crossed-out price. Leave empty for no discount.">
            <Input id="p-compare" inputMode="numeric" value={values.compareAtPrice} onChange={(event) => set("compareAtPrice", event.target.value.replace(/[^\d.]/g, ""))} invalid={Boolean(errors.compareAtPrice)} prefix="₹" placeholder="4290" />
          </Field>
          <Field label="Low-stock flag" htmlFor="p-low" hint="Warns you and the shop when stock drops to this." error={errors.lowStockThreshold}>
            <Input id="p-low" inputMode="numeric" value={values.lowStockThreshold} onChange={(event) => set("lowStockThreshold", event.target.value.replace(/\D/g, ""))} invalid={Boolean(errors.lowStockThreshold)} placeholder="6" />
          </Field>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          <span className="nums rounded-full bg-sand px-2.5 py-1 text-ink">Shop shows {money(Number(values.price) || 0)}</span>
          {previewDiscount > 0 ? (
            <span className="nums rounded-full bg-good-tint px-2.5 py-1 text-good">{previewDiscount}% off · was {money(Number(values.compareAtPrice) || 0)}</span>
          ) : (
            <span className="text-[11.5px]">No discount — the price stands alone.</span>
          )}
          <span className="nums rounded-full bg-sand px-2.5 py-1">
            {totalStock} in stock
          </span>
        </p>
      </Section>

      <Section title="Photos" hint="First photo is the one on the shelf and in search results." error={errors.images}>
        <ImageManager images={media} onChange={setMedia} />
      </Section>

      <Section title="Sizes, colours and stock" hint="Type the counts you can see on the hangers.">
        <VariantEditor
          sizes={variants.sizes}
          colors={variants.colors}
          stock={variants.stock}
          lowStockThreshold={Number(values.lowStockThreshold) || 0}
          onChange={(next) => setVariants({ sizes: next.sizes, colors: next.colors, stock: next.stock })}
        />
        {errors.sizes || errors.colors ? (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-bad">
            <IconAlert size={13} /> {errors.sizes ?? errors.colors}
          </p>
        ) : null}
      </Section>

      <Section title="Description" hint="Plain, honest, no adjectives you would not say across the counter.">
        <div className="grid gap-4">
          <Field label="Description" htmlFor="p-desc" error={errors.description} hint={`${values.description.trim().length} characters · 2 to 4 short lines work best.`}>
            <Textarea id="p-desc" rows={4} value={values.description} onChange={(event) => set("description", event.target.value)} placeholder="Hand-finished quilted bandhgala in cotton-silk, matte brass buttons, half-canvas front." invalid={Boolean(errors.description)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fabric" htmlFor="p-fabric" error={errors.fabric}>
              <Input id="p-fabric" value={values.fabric} onChange={(event) => set("fabric", event.target.value)} invalid={Boolean(errors.fabric)} placeholder="62% cotton, 38% silk, 240 gsm" />
            </Field>
            <Field label="Care" htmlFor="p-care" error={errors.care}>
              <Input id="p-care" value={values.care} onChange={(event) => set("care", event.target.value)} invalid={Boolean(errors.care)} placeholder="Dry clean only. Store on a wide hanger." />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="On the shop floor" hint="Visibility, plus which home-page rail this piece earns a place in.">
        <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
          <Field label="Visibility" htmlFor="p-status">
            <Select id="p-status" value={values.status} onChange={(event) => set("status", event.target.value as typeof values.status)}>
              <option value="published">Published — live in the shop</option>
              <option value="draft">Draft — only you can see it</option>
              <option value="hidden">Hidden — sold but not listed</option>
            </Select>
          </Field>
          <div className="flex flex-wrap items-start gap-2 pt-1">
            <FlagToggle label="New arrival" description="Home page “New Arrivals” rail" active={flags.isNewArrival} onToggle={() => setFlags((f) => ({ ...f, isNewArrival: !f.isNewArrival }))} />
            <FlagToggle label="Bestseller" description="“Best sellers” rail" active={flags.isBestseller} onToggle={() => setFlags((f) => ({ ...f, isBestseller: !f.isBestseller }))} />
            <FlagToggle label="Featured" description="Featured grid and collection hero" active={flags.isFeatured} onToggle={() => setFlags((f) => ({ ...f, isFeatured: !f.isFeatured }))} />
          </div>
        </div>
      </Section>

      {serverError ? (
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-3 py-2.5 text-[12.5px] leading-relaxed text-bad">
          <IconAlert size={14} className="mt-0.5 shrink-0" />
          {serverError}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="submit" variant="solid" size="md" loading={busy}>
          {editing ? "Save changes" : "Create product"}
        </Button>
        {editing ? (
          <LinkButton href={`/product/${values.slug || initial.slug}`} variant="light" size="md" iconRight={<IconArrowUpRight size={13} />}>
            View in shop
          </LinkButton>
        ) : null}
        <Link href="/admin/products" className="ml-auto text-[12.5px] text-muted underline decoration-line underline-offset-4 hover:text-ink">
          Back to catalogue
        </Link>
      </div>
    </form>
  );
}

function Section({ title, hint, error, children }: { title: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <section className="admin-card p-4 sm:p-5">
      <header className="mb-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          {error ? (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-bad">
              <IconAlert size={12} /> {error}
            </span>
          ) : null}
        </div>
        {hint ? <p className="mt-1 text-[12px] leading-relaxed text-muted">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}

function FlagToggle({ label, description, active, onToggle }: { label: string; description: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "flex min-w-[168px] flex-1 items-start gap-2.5 rounded-[var(--radius-sm)] border p-3 text-left transition-colors sm:flex-none",
        active ? "border-ink bg-sand" : "border-line bg-paper hover:border-ink",
      )}
    >
      <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border", active ? "border-ink bg-ink text-bone" : "border-line text-transparent")}>
        <IconCheck size={11} />
      </span>
      <span>
        <span className="block text-[12.5px] font-medium text-ink">{label}</span>
        <span className="block text-[11px] leading-snug text-muted">{description}</span>
      </span>
    </button>
  );
}
