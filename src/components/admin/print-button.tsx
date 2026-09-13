"use client";

import { IconPrinter } from "@/components/ui/icons";

/**
 * A packing slip is what actually gets used in a shop: print it, tick the boxes,
 * staple it to the parcel. window.print with the browser's own dialogue beats
 * shipping a PDF library for one button.
 */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="admin-chip h-9 px-3 text-[12.5px] print:hidden">
      <IconPrinter size={13} /> Print slip
    </button>
  );
}
