"use client";

import { useState } from "react";
import { IconClose, IconPlus } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type ProductColor = { name: string; hex: string };
export type ProductStockCell = { size: string; color: string; stock: number };

const COMMON_SIZES = ["S", "M", "L", "XL", "XXL", "38", "40", "42", "44", "Free"];

const SWATCHES = ["#1c1d1f", "#f4f1ea", "#4a5b6b", "#6b4b3a", "#2f4438", "#8d9aa6", "#b8863b", "#3c3f52"];

/**
 * Size × colour stock grid. This is the screen the owner lives in on a Tuesday
 * afternoon, so it is a spreadsheet, not a wizard: type a number, tab to the next
 * cell, see the total. Sizes and colours can be invented here — nothing is a
 * closed list, the taxonomy table absorbs whatever is new.
 */
export function VariantEditor({
  sizes,
  colors,
  stock,
  onChange,
  lowStockThreshold,
}: {
  sizes: string[];
  colors: ProductColor[];
  stock: ProductStockCell[];
  onChange: (next: { sizes: string[]; colors: ProductColor[]; stock: ProductStockCell[] }) => void;
  lowStockThreshold: number;
}) {
  const [sizeDraft, setSizeDraft] = useState("");
  const [colorDraft, setColorDraft] = useState<{ name: string; hex: string } | null>(null);
  const [fill, setFill] = useState("");

  const cellValue = (size: string, color: string) => stock.find((entry) => entry.size === size && entry.color === color)?.stock ?? 0;

  const setCell = (size: string, color: string, value: number) => {
    const rest = stock.filter((entry) => !(entry.size === size && entry.color === color));
    onChange({ sizes, colors, stock: [...rest, { size, color, stock: Math.max(0, Math.min(999, value || 0)) }] });
  };

  const addSize = (label: string) => {
    const clean = label.trim().slice(0, 8).toUpperCase();
    if (!clean || sizes.includes(clean)) return;
    const nextSizes = [...sizes, clean];
    // New size inherits nothing — the owner types the count they can see on the shelf.
    onChange({ sizes: nextSizes, colors, stock });
    setSizeDraft("");
  };

  const removeSize = (label: string) => {
    onChange({ sizes: sizes.filter((size) => size !== label), colors, stock: stock.filter((entry) => entry.size !== label) });
  };

  const addColor = () => {
    const draft = colorDraft ?? { name: "New colour", hex: "#2b2c2e" };
    const name = draft.name.trim() || "New colour";
    if (colors.some((color) => color.name.toLowerCase() === name.toLowerCase())) {
      setColorDraft(null);
      return;
    }
    onChange({ sizes, colors: [...colors, { name, hex: draft.hex }], stock });
    setColorDraft(null);
  };

  const removeColor = (name: string) => {
    onChange({ sizes, colors: colors.filter((color) => color.name !== name), stock: stock.filter((entry) => entry.color !== name) });
  };

  const patchColor = (index: number, patch: Partial<ProductColor>) => {
    onChange({ sizes, colors: colors.map((color, position) => (position === index ? { ...color, ...patch } : color)), stock });
  };

  const total = sizes.reduce((sum, size) => sum + colors.reduce((row, color) => row + cellValue(size, color.name), 0), 0);

  const applyFill = () => {
    const value = Math.max(0, Math.min(999, Number(fill) || 0));
    const next: ProductStockCell[] = [];
    for (const size of sizes) for (const color of colors) next.push({ size, color: color.name, stock: value });
    onChange({ sizes, colors, stock: next });
    setFill("");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="rounded-[var(--radius-sm)] border border-line bg-paper p-3">
          <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Sizes offered</legend>
          <ul className="flex flex-wrap gap-1.5">
            {sizes.length === 0 ? <li className="text-[12px] text-muted">No sizes yet — a one-size item can use “Free”.</li> : null}
            {sizes.map((size) => (
              <li key={size}>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-bone pl-2.5 pr-1 text-[12px] text-ink">
                  {size}
                  <button type="button" onClick={() => removeSize(size)} aria-label={`Remove size ${size}`} className="grid h-5 w-5 place-items-center rounded-full text-muted hover:bg-sand hover:text-bad">
                    <IconClose size={11} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex gap-2">
            <input
              value={sizeDraft}
              onChange={(event) => setSizeDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSize(sizeDraft);
                }
              }}
              placeholder="Add a size"
              aria-label="Add a size"
              className="admin-input h-8 flex-1 text-[12.5px]"
            />
            <button type="button" onClick={() => addSize(sizeDraft)} className="admin-chip h-8 px-2.5">
              <IconPlus size={12} /> Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {COMMON_SIZES.filter((size) => !sizes.includes(size)).map((size) => (
              <button key={size} type="button" onClick={() => addSize(size)} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-ink hover:text-ink">
                {size}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-[var(--radius-sm)] border border-line bg-paper p-3">
          <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Colours offered</legend>
          <ul className="space-y-1.5">
            {colors.length === 0 ? <li className="text-[12px] text-muted">No colours yet — add at least “Midnight” or whatever the tag says.</li> : null}
            {colors.map((color, index) => (
              <li key={color.name} className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : "#2b2c2e"}
                  onChange={(event) => patchColor(index, { hex: event.target.value })}
                  aria-label={`Swatch colour for ${color.name}`}
                  className="h-7 w-7 shrink-0 cursor-pointer rounded border border-line bg-transparent p-0"
                />
                <input
                  value={color.name}
                  onChange={(event) => patchColor(index, { name: event.target.value })}
                  aria-label={`Colour ${index + 1} name`}
                  className="admin-input h-8 flex-1 text-[12.5px]"
                />
                <button type="button" onClick={() => removeColor(color.name)} aria-label={`Remove ${color.name}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-sand hover:text-bad">
                  <IconClose size={12} />
                </button>
              </li>
            ))}
          </ul>
          {colorDraft ? (
            <div className="mt-2.5 flex items-center gap-2">
              <input
                type="color"
                value={colorDraft.hex}
                onChange={(event) => setColorDraft({ ...colorDraft, hex: event.target.value })}
                aria-label="New swatch colour"
                className="h-7 w-7 cursor-pointer rounded border border-line bg-transparent p-0"
              />
              <input
                autoFocus
                value={colorDraft.name}
                onChange={(event) => setColorDraft({ ...colorDraft, name: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addColor();
                  }
                }}
                placeholder="Colour name"
                className="admin-input h-8 flex-1 text-[12.5px]"
              />
              <button type="button" onClick={addColor} className="admin-chip h-8 px-2.5">
                Save
              </button>
            </div>
          ) : (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setColorDraft({ name: "", hex: "#2b2c2e" })} className="admin-chip h-8 px-2.5">
                <IconPlus size={12} /> Add colour
              </button>
              {SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Start a colour from ${hex}`}
                  onClick={() => setColorDraft({ name: "", hex })}
                  className="h-4 w-4 rounded-full border border-line"
                  style={{ background: hex }}
                />
              ))}
            </div>
          )}
        </fieldset>
      </div>

      {sizes.length > 0 && colors.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-sand px-3 py-2">
            <p className="text-[12px] text-graphite">
              <span className="font-semibold text-ink">{total}</span> pieces across {sizes.length * colors.length} combination{sizes.length * colors.length === 1 ? "" : "s"}
              {lowStockThreshold > 0 ? <span className="text-muted"> · flagged low at {lowStockThreshold} or fewer</span> : null}
            </p>
            <div className="flex items-center gap-1.5">
              <input value={fill} onChange={(event) => setFill(event.target.value)} inputMode="numeric" placeholder="Fill all with" aria-label="Stock value to fill every cell with" className="admin-input h-8 w-[124px] text-[12.5px]" />
              <button type="button" onClick={applyFill} className="admin-chip h-8 px-2.5">
                Apply
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-line bg-paper">
            <table className="admin-table min-w-[420px]">
              <caption className="sr-only">Stock per size and colour</caption>
              <thead>
                <tr>
                  <th scope="col">Colour</th>
                  {sizes.map((size) => (
                    <th key={size} scope="col" className="num">
                      {size}
                    </th>
                  ))}
                  <th scope="col" className="num">
                    Row
                  </th>
                </tr>
              </thead>
              <tbody>
                {colors.map((color) => {
                  const rowTotal = sizes.reduce((sum, size) => sum + cellValue(size, color.name), 0);
                  return (
                    <tr key={color.name}>
                      <th scope="row" className="whitespace-nowrap border-b border-line-soft px-3 py-2.5 text-left text-[12.5px] font-medium text-ink">
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full ring-1 ring-line" style={{ background: color.hex }} aria-hidden="true" />
                          {color.name}
                        </span>
                      </th>
                      {sizes.map((size) => {
                        const value = cellValue(size, color.name);
                        return (
                          <td key={size} className="num">
                            <input
                              type="number"
                              min={0}
                              max={999}
                              value={value}
                              onChange={(event) => setCell(size, color.name, Number(event.target.value))}
                              aria-label={`${color.name} size ${size} stock`}
                              className={cn(
                                "admin-input h-8 w-[58px] px-1.5 text-right text-[12.5px]",
                                value === 0 && "border-bad/30 bg-bad-tint text-bad",
                                value > 0 && value <= lowStockThreshold && "border-warn/35 bg-warn-tint text-warn",
                              )}
                            />
                          </td>
                        );
                      })}
                      <td className="num text-[12px] font-semibold text-ink">{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="rounded-[var(--radius-sm)] border border-dashed border-line px-3 py-6 text-center text-[12.5px] text-muted">
          Add at least one size and one colour and the stock grid appears here.
        </p>
      )}
    </div>
  );
}
