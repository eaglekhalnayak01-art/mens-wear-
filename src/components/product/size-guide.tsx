import { IconRuler } from "@/components/ui/icons";

/**
 * Real numbers, not a placeholder table. The rows chosen depend on what the
 * product actually is, because a denim guide and a suit guide disagree on purpose.
 */
const GUIDES = {
  tops: {
    title: "Shirts, T-shirts & kurtas",
    note: "Body measurements in inches. Our shirts are cut regular — if you like room, take the next size.",
    columns: ["Size", "Chest", "Shoulder", "Sleeve", "Length"],
    rows: [
      ["S / 38", "38–39", "17.0", "23.5", "29.0"],
      ["M / 40", "40–41", "17.8", "24.0", "29.5"],
      ["L / 42", "42–43", "18.5", "24.5", "30.0"],
      ["XL / 44", "44–45", "19.3", "25.0", "30.5"],
      ["2XL / 46", "46–48", "20.0", "25.5", "31.0"],
    ],
  },
  suiting: {
    title: "Suits, blazers & Nehru jackets",
    note: "Jacket chest is garment measurement, i.e. body chest + 4 inches of ease. Trouser waist is the relaxed waist.",
    columns: ["Size", "Jacket chest", "Waist (trouser)", "Jacket length", "Shoulder"],
    rows: [
      ["38R", "42", "32", "29.5", "17.2"],
      ["40R", "44", "34", "30.0", "18.0"],
      ["42R", "46", "36", "30.5", "18.6"],
      ["44R", "48", "38", "31.0", "19.4"],
      ["46R", "50", "40", "31.5", "20.0"],
    ],
  },
  denim: {
    title: "Jeans & chinos",
    note: "Waist in inches. Our denim has about 2% stretch and relaxes half a size after a few wears.",
    columns: ["Size", "Waist", "Hip", "Inseam", "Front rise"],
    rows: [
      ["30", "30.5", "38", "32", "9.5"],
      ["32", "32.5", "40", "32", "9.8"],
      ["34", "34.5", "42", "33", "10.1"],
      ["36", "36.5", "44", "33", "10.5"],
      ["38", "38.5", "46", "34", "10.8"],
    ],
  },
  knitwear: {
    title: "Sweaters & sweatshirts",
    note: "Knitwear stretches, so chest is the flat garment × 2. Oversized styles run one size roomier than that.",
    columns: ["Size", "Chest (garment)", "Sleeve", "Length"],
    rows: [
      ["S", "40", "24.5", "26.5"],
      ["M", "42", "25.0", "27.0"],
      ["L", "44", "25.5", "27.5"],
      ["XL", "46", "26.0", "28.0"],
      ["2XL", "49", "26.5", "28.5"],
    ],
  },
} as const;

function pickGuide(category = "", subCategory?: string | null): keyof typeof GUIDES {
  const haystack = `${category} ${subCategory ?? ""}`.toLowerCase();
  if (/jean|denim|trouser|chino|short|pant/.test(haystack)) return "denim";
  if (/suit|blazer|waistcoat|bandhgala|nehru|coat/.test(haystack)) return "suiting";
  if (/sweater|knit|hoodie|sweatshirt|pullover|cardigan/.test(haystack)) return "knitwear";
  return "tops";
}

export function SizeGuide({ category, subCategory }: { category?: string; subCategory?: string | null }) {
  const guide = GUIDES[pickGuide(category, subCategory)];

  return (
    <div>
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <IconRuler size={16} className="text-brass" /> {guide.title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{guide.note}</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="border-y border-line">
              {guide.columns.map((column) => (
                <th key={column} className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((row) => (
              <tr key={row[0]} className="border-b border-line-soft last:border-b-0">
                {row.map((cell, index) => (
                  <td
                    key={index}
                    className={index === 0 ? "py-2 pr-3 text-[13px] font-medium text-ink" : "nums py-2 pr-3 text-[13px] text-graphite"}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
        Between two sizes? Take the larger one for suiting and knitwear, the smaller for linen and oversized cuts — both relax with wear. If you would rather
        be sure, message us on WhatsApp with your chest and height and we will tell you what we would sell you.
      </p>
    </div>
  );
}
