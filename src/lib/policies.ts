/**
 * The four policy pages the shop publishes. Content lives in `settings` so the
 * owner can rewrite a policy from the dashboard without a deploy; this file only
 * decides which policy exists, how it is titled and where its text comes from.
 */
export const POLICY_PAGES = {
  shipping: {
    title: "Shipping policy",
    intro: "How parcels leave the shop, what they cost and how long they take.",
    key: "shippingPolicy",
    updated: "April 2026",
  },
  returns: {
    title: "Returns & exchanges",
    intro: "Sizes happen. Here is exactly how an exchange works, in plain words.",
    key: "returnPolicy",
    updated: "April 2026",
  },
  privacy: {
    title: "Privacy policy",
    intro: "What we collect, why we collect it and who ever sees it.",
    key: "privacyPolicy",
    updated: "April 2026",
  },
  terms: {
    title: "Terms of use",
    intro: "The rules for ordering from us — short enough to read once.",
    key: "terms",
    updated: "April 2026",
  },
} as const;

export type PolicySlug = keyof typeof POLICY_PAGES;

export function policySlugs(): PolicySlug[] {
  return Object.keys(POLICY_PAGES) as PolicySlug[];
}

export function splitPolicyBlocks(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("- ") || block.startsWith("* ")) {
        return { kind: "list" as const, items: block.split("\n").map((line) => line.replace(/^[-*]\s+/, "").trim()).filter(Boolean) };
      }
      return { kind: "paragraph" as const, text: block.split("\n").join(" ") };
    });
}
