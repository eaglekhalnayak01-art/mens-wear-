/**
 * Minimal flat-sketch garment artwork (200 × 250 grid, single stroke weight).
 * Used by /api/placeholder for products whose photography is pending, and by
 * the admin product form as its empty state. Hand-authored so it matches the
 * brand instead of looking like a stock icon.
 */
export type GarmentKind =
  | "tshirts"
  | "shirts"
  | "jeans"
  | "trousers"
  | "formal-wear"
  | "casual-wear"
  | "jackets"
  | "hoodies"
  | "sweaters"
  | "blazers"
  | "ethnic-wear"
  | "kurta"
  | "shorts"
  | "track-pants";

type Sketch = { paths: string[]; circles?: [number, number, number][] };

const TEA: Record<string, Sketch> = {
  tee: {
    paths: [
      "M70 46 56 40 36 64 56 82 62 74 62 206 138 206 138 74 144 82 164 64 144 40 130 46",
      "M70 46c10 15 50 15 60 0",
    ],
  },
  shirt: {
    paths: [
      "M68 48 50 42 32 66 54 84 58 76 58 208 142 208 142 76 146 84 168 66 150 42 132 48",
      "M68 48 100 66 132 48",
      "M100 66 100 208",
      "M68 48 84 40 100 66",
      "M132 48 116 40 100 66",
    ],
    circles: [
      [100, 96, 2.4],
      [100, 126, 2.4],
      [100, 156, 2.4],
      [100, 186, 2.4],
    ],
  },
  jeans: {
    paths: [
      "M58 40h84v22l4 148h-42l-6-104-6 104H54l4-148z",
      "M58 52h84",
      "M74 40v14",
      "M120 62c-12 10-30 10-42 0",
    ],
  },
  trouser: {
    paths: [
      "M60 42h80l6 166h-38l-8-108-8 108H54z",
      "M60 54h80",
      "M100 54v14",
      "M78 70v126",
      "M122 70v126",
    ],
  },
  blazer: {
    paths: [
      "M66 50 46 44 30 70 52 88 52 206 96 206 100 130 104 206 148 206 148 88 170 70 154 44 134 50",
      "M66 50 100 118 134 50",
      "M66 50 86 74 100 118",
      "M134 50 114 74 100 118",
      "M52 108h20",
      "M128 108h20",
    ],
    circles: [
      [93, 132, 2.6],
      [93, 156, 2.6],
    ],
  },
  jacket: {
    paths: [
      "M66 48 46 42 30 68 52 86 48 196h104l-4-110 22-18-16-26-20 6",
      "M66 48c14 14 54 14 68 0",
      "M100 56v140",
      "M48 196h104",
      "M60 118h24",
      "M116 118h24",
    ],
  },
  hoodie: {
    paths: [
      "M64 52 44 46 28 72 50 90 46 200h108l-4-110 22-18-16-26-20 6",
      "M64 52c8-18 64-18 72 0",
      "M74 44c10 22 42 22 52 0",
      "M100 56v56",
      "M70 150h60v26H70z",
    ],
  },
  sweater: {
    paths: [
      "M66 48 40 60 26 150l24 10 4-46v88h92v-88l4 46 24-10-14-90-26-12",
      "M66 48c12 16 56 16 68 0",
      "M54 172h92",
      "M92 70v120",
      "M108 70v120",
    ],
  },
  kurta: {
    paths: [
      "M70 44 50 38 34 62 54 80 50 226h100l-4-146 20-18-16-24-20 6",
      "M70 44c12 12 46 12 60 0",
      "M100 52v70",
      "M88 44v78",
      "M112 44v78",
      "M54 170v56",
      "M146 170v56",
    ],
    circles: [
      [100, 66, 2.2],
      [100, 86, 2.2],
      [100, 106, 2.2],
    ],
  },
  shorts: {
    paths: ["M58 52h84l6 96h-40l-8-58-8 58H52z", "M58 64h84", "M100 64v12", "M76 52v14", "M124 52v14"],
  },
  joggers: {
    paths: ["M62 46h76l4 130-16 4v-40h-6v34H78v-34h-6v40l-16-4z", "M62 58h76", "M100 58v14", "M74 46v12", "M126 46v12"],
  },
};

const BY_KIND: Record<string, keyof typeof TEA> = {
  tshirts: "tee",
  "t-shirts": "tee",
  shirts: "shirt",
  jeans: "jeans",
  denim: "jeans",
  trousers: "trouser",
  formal: "blazer",
  "formal-wear": "blazer",
  blazers: "blazer",
  "casual-wear": "shirt",
  jackets: "jacket",
  hoodies: "hoodie",
  sweaters: "sweater",
  knit: "sweater",
  ethnic: "kurta",
  "ethnic-wear": "kurta",
  kurta: "kurta",
  shorts: "shorts",
  "track-pants": "joggers",
};

export function sketchFor(kindOrSeed: string) {
  const key = kindOrSeed.toLowerCase().trim();
  const direct = BY_KIND[key];
  if (direct) return { kind: key, sketch: TEA[direct] };
  const words = key.split(/[^a-z]+/);
  const match = Object.keys(BY_KIND).find((candidate) => words.includes(candidate.replace(/-/g, "")) || words.some((w) => candidate.includes(w)));
  if (match) return { kind: key, sketch: TEA[BY_KIND[match]] };
  return { kind: key, sketch: TEA.shirt };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Wraps a long product name into at most two lines of ~22 characters. */
function wrapName(name: string, perLine = 22) {
  const words = name.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > perLine && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 2);
}

export function renderPlaceholderSvg({ seed, name, kind }: { seed: string; name?: string; kind?: string }) {
  const lookup = kind || seed;
  const { sketch } = sketchFor(lookup);
  const label = (name || seed).replace(/[-_]/g, " ").replace(/\.svg$/i, "").trim();
  const lines = wrapName(label, 22);

  const strokes = sketch.paths
    .map((d) => `<path d="${d}" fill="none" stroke="#17181a" stroke-opacity=".55" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("");
  const dots = (sketch.circles ?? [])
    .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#17181a" fill-opacity=".45"/>`)
    .join("");

  const title = lines
    .map((line, index) => `<text x="100" y="${258 + index * 22}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="17" fill="#17181a">${escapeXml(line)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300" role="img" aria-label="${escapeXml(label)} — photography coming soon">
  <rect width="200" height="300" fill="#f2efe9"/>
  <rect x="0.5" y="0.5" width="199" height="299" fill="none" stroke="#17181a" stroke-opacity=".07"/>
  <g transform="translate(0,20)">${strokes}${dots}</g>
  <text x="100" y="34" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="7.5" letter-spacing="2.6" fill="#17181a" fill-opacity=".45">LOOKBOOK</text>
  ${title}
</svg>`;
}
