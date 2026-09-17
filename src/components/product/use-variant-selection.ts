"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import type { CartItem } from "@/components/cart/cart-provider";
import type { ProductDetail } from "@/server/repositories/types";

export const MAX_QTY = 10;

export type ColourOption = { name: string; hex: string | null; inStock: boolean };
export type SizeRow = { label: string; stock: number };

/**
 * Variant selection lives here so the panel and the sticky mobile bar can share
 * one source of truth — two components each holding their own size state is how
 * a product page starts telling two different stories.
 */
export function useVariantSelection(product: ProductDetail) {
  const colours = useMemo<ColourOption[]>(() => {
    const names = product.colors.length
      ? product.colors.map((colour) => colour.name)
      : [...new Set(product.variants.map((variant) => variant.color).filter((value): value is string => Boolean(value)))];
    return names.map((name) => ({
      name,
      hex: product.colors.find((colour) => colour.name === name)?.hex ?? product.variants.find((variant) => variant.color === name)?.colorHex ?? null,
      inStock: product.variants.some((variant) => variant.color === name && variant.stock > 0),
    }));
  }, [product]);

  const sizeRows = useMemo<SizeRow[]>(
    () =>
      [...new Set(product.variants.map((variant) => variant.size).filter((value): value is string => Boolean(value)))].map((label) => ({
        label,
        stock: product.variants
          .filter((variant) => variant.size === label)
          .reduce((sum, variant) => sum + variant.stock, 0),
      })),
    [product.variants],
  );

  const [color, setColor] = useState<string | null>(colours.find((entry) => entry.inStock)?.name ?? colours[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const sizesForColour = useMemo<SizeRow[]>(
    () =>
      sizeRows.map((row) => ({
        label: row.label,
        stock: product.variants
          .filter((variant) => variant.size === row.label && (!color || variant.color === color))
          .reduce((sum, variant) => sum + variant.stock, 0),
      })),
    [sizeRows, color, product.variants],
  );

  const variant = useMemo(
    () => product.variants.find((entry) => entry.color === color && entry.size === size) ?? null,
    [product.variants, color, size],
  );

  const low = variant ? variant.stock > 0 && variant.stock <= product.lowStockThreshold : false;
  const soldOut = !product.inStock;
  const quantityCap = Math.max(1, Math.min(MAX_QTY, variant?.stock ?? 1));

  const selectColour = (name: string) => {
    setColor(name);
    setSize(null);
    setError(null);
    setQty(1);
  };

  const selectSize = (label: string) => {
    setSize(label);
    setQty(1);
    setError(null);
  };

  return {
    colours,
    sizeRows: sizesForColour,
    color,
    size,
    qty,
    error,
    setError,
    setColor: selectColour,
    setSize: selectSize,
    setQty,
    variant,
    low,
    soldOut,
    quantityCap,
  };
}

export type Selection = ReturnType<typeof useVariantSelection>;

/** Payload for `useCart().add()` — kept next to the hook so the two never drift. */
export function cartItemFor(product: ProductDetail, selection: Selection): Omit<CartItem, "qty"> | null {
  const variant = selection.variant;
  if (!variant) return null;
  return {
    variantId: variant.id,
    productId: product.id,
    name: product.name,
    slug: product.slug,
    size: variant.size,
    color: variant.color,
    unitPrice: variant.price || product.price,
    compareAtPrice: product.compareAtPrice,
    image: product.image?.src ?? "",
    sku: variant.sku ?? product.sku,
    availableStock: variant.stock,
  };
}

/** "Buy it now" needs the cart write to land before navigation, so it lives here. */
export function useBuyNow() {
  const router = useRouter();
  return () => router.push("/checkout");
}
