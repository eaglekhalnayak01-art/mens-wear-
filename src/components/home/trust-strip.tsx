import { IconReturn, IconShield, IconTruck, IconSparkle } from "@/components/ui/icons";

const ITEMS = [
  { icon: IconTruck, title: "Free delivery over ₹1,999", note: "2–4 working days across India" },
  { icon: IconReturn, title: "Free size exchange", note: "7 days, we cover the courier" },
  { icon: IconShield, title: "Cash on delivery", note: "Pay when the parcel reaches you" },
  { icon: IconSparkle, title: "Checked before packing", note: "Stitch, button and press inspection" },
];

export function TrustStrip() {
  return (
    <section aria-label="How the shop works" className="border-b border-line bg-paper">
      <ul className="shop-shell grid grid-cols-2 divide-line-soft lg:grid-cols-4 lg:divide-x">
        {ITEMS.map(({ icon: Icon, title, note }, index) => (
          <li
            key={title}
            className={
              "flex items-start gap-3 px-1 py-5 lg:px-6 " +
              (index % 2 === 0 ? "border-r border-line-soft lg:border-r-0 " : "") +
              (index < 2 ? "border-b border-line-soft lg:border-b-0 " : "") +
              (index === 2 ? "lg:border-l lg:border-line-soft " : "") +
              (index === 3 ? "lg:border-l lg:border-line-soft " : "")
            }
          >
            <Icon size={19} className="mt-[1px] shrink-0 text-brass" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-snug text-ink">{title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">{note}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
