/**
 * Fixed editorial copy that a shop would not change weekly (reviews, sizing
 * advice, FAQs). Anything the owner should be able to edit lives in the
 * `settings` table instead — hero text, policies, delivery copy.
 */

export const REVIEWS = [
  {
    name: "Rohit M.",
    city: "Surat",
    bought: "Charcoal Wool Two-Piece Suit",
    rating: 5,
    quote:
      "I ordered the suit eleven days before a wedding and expected to settle for something. They hemmed the trousers themselves, sent photos before packing, and it reached Surat in three days. The lapel roll is better than the jacket I replaced.",
  },
  {
    name: "Aditya K.",
    city: "Mumbai",
    bought: "Pure Linen Camp-Collar Shirt",
    rating: 5,
    quote:
      "Third summer with the first one — no thinning at the collar, and the colour has faded the way linen should instead of going patchy. Bought a second in sage.",
  },
  {
    name: "Faisal S.",
    city: "Ahmedabad",
    bought: "Raw Indigo Slim Jeans",
    rating: 4,
    quote:
      "Good denim at this price and the taper is honest. I sized up one waist as the size guide suggested and it was the right call. One small stitch near the pocket, they replaced it on WhatsApp without argument.",
  },
  {
    name: "Nikhil V.",
    city: "Bengaluru",
    bought: "Boxy Oversized Cotton Tee",
    rating: 5,
    quote:
      "Finally a tee that is not cut for a teenager. The weight is right for AC and it holds its shape after twenty washes. Ordered three more.",
  },
  {
    name: "Karan B.",
    city: "Delhi NCR",
    bought: "Merino Crew-Neck Sweater",
    rating: 5,
    quote:
      "Wore it under a blazer for a Delhi December and it was enough. No itch at the neck, which is the only thing I check.",
  },
  {
    name: "Imran Q.",
    city: "Hyderabad",
    bought: "Handloom Cotton Kurta",
    rating: 5,
    quote:
      "Bought for Eid, got compliments on the weave. They told me on the phone exactly how it would shrink after the first wash — it did, and it still fits right.",
  },
];

export const SIZE_ADVICE = [
  { label: "Chest", note: "Measure around the fullest part, keeping the tape level and one finger inside." },
  { label: "Shoulder", note: "Seam should end exactly at the shoulder bone. Past it, the shirt looks borrowed." },
  { label: "Sleeve", note: "Bend your arm once; if the cuff pulls back more than 1 cm, go a size up." },
  { label: "Waist", note: "For jeans, take your true waist — our denim has 2% stretch and relaxes half a size." },
];

export const FAQS = [
  {
    q: "Do I have to create an account to order?",
    a: "No. Add what you like and check out as a guest with your mobile number, address and PIN code. Signing in with a one-time code is only useful if you want your orders and addresses saved.",
  },
  {
    q: "What if the size does not fit?",
    a: "Message us on WhatsApp within 7 days of delivery with your order number and we will arrange a pickup and send the next size. The first exchange is free — we pay both sides of the courier.",
  },
  {
    q: "Can I pay cash when it arrives?",
    a: "Yes. Cash on delivery is available on almost every PIN code we ship to, with no extra handling fee. Please keep the exact amount ready — delivery partners rarely carry change.",
  },
  {
    q: "Do the colours on screen match the cloth?",
    a: "Close, but not identical. We shoot in daylight and do not push saturation in editing, so a sand linen may look a shade warmer or cooler on your phone. Ask us on WhatsApp and we will send a photo taken in the shop.",
  },
  {
    q: "Can you stitch or alter?",
    a: "Yes — trousers, shirts and kurtas can be altered in store. Mention it in the order notes and we will call you for measurements before dispatch. Alteration is charged at cost, typically ₹150–₹400.",
  },
  {
    q: "Do you sell in bulk for shops or corporate gifting?",
    a: "We do. Write to us on WhatsApp with the pieces, sizes and quantity, and we will send a proforma with wholesale rates and a delivery timeline.",
  },
];

export const BRAND_POINTS = [
  {
    title: "We buy the cloth, not the label",
    text: "Fabric is chosen at the mill or the weaver's shed, then cut in our own pattern room. That is how a ₹12,995 suit can carry a half-canvas front.",
  },
  {
    title: "Every piece is checked before it is folded",
    text: "Stitch, button, collar roll and hem are inspected on the table. If it fails, it goes back to the tailor and not to you.",
  },
  {
    title: "We remember what you bought",
    text: "Ask for the size you wore last Diwali and we will look it up. Most of our customers have been with us for years.",
  },
];
