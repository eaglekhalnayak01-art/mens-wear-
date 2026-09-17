import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/server/queries";
import { interpolatePolicy } from "@/server/repositories/settings.repository";
import { policyJsonLd } from "@/lib/seo";
import { POLICY_PAGES, policySlugs, splitPolicyBlocks } from "@/lib/policies";

export const revalidate = 300;

type Params = Promise<{ slug: string }>;

const PAGES = POLICY_PAGES;
type PolicyKey = keyof typeof PAGES;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = PAGES[slug as PolicyKey];
  if (!page) return {};
  return {
    title: page.title,
    description: page.intro,
    alternates: { canonical: `/policies/${slug}` },
  };
}

export default async function PolicyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = PAGES[slug as PolicyKey];
  if (!page) notFound();

  const settings = getSettings();
  const body = interpolatePolicy(settings[page.key] || "", settings);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(policyJsonLd(page.title, page.intro, slug)) }} />
      <article className="narrow-shell py-12 md:py-16">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink-soft">{page.title}</li>
          </ol>
        </nav>

        <header>
          <p className="eyebrow mb-2.5">{settings.shopName}</p>
          <h1 className="font-display text-[clamp(1.9rem,1.5rem+1.6vw,2.6rem)] leading-[1.1] text-ink">{page.title}</h1>
          <p className="mt-3 max-w-[62ch] text-[14.5px] leading-[1.7] text-graphite">{page.intro}</p>
          <p className="mt-3 text-[12px] text-muted">Last updated {page.updated}</p>
        </header>

        <div className="prose-shop mt-8">
          {splitPolicyBlocks(body).map((block, index) =>
            block.kind === "list" ? (
              <ul key={index} className="ml-1 space-y-1.5">
                {block.items.map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-[9px] h-[3px] w-[3px] shrink-0 rounded-full bg-brass" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p key={index}>{block.text}</p>
            ),
          )}
        </div>

        <footer className="mt-12 border-t border-line pt-6">
          <p className="text-[13.5px] leading-relaxed text-muted">
            Anything here unclear? Call the shop on{" "}
            <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="link-line text-ink">
              {settings.phone}
            </a>{" "}
            or write to{" "}
            <a href={`mailto:${settings.email}`} className="link-line text-ink">
              {settings.email}
            </a>
            . We would rather explain it now than argue about it later.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {policySlugs()
              .filter((key) => key !== slug)
              .map((key) => (
                <li key={key}>
                  <Link href={`/policies/${key}`} className="link-line text-graphite transition-colors hover:text-ink">
                    {PAGES[key].title}
                  </Link>
                </li>
              ))}
          </ul>
        </footer>
      </article>
    </>
  );
}
