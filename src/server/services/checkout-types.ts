/** Shared shape of a submitted checkout (validated by checkoutSchema). */
export type CheckoutInput = {
  customer: { name: string; mobile: string; email?: string };
  shipping: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pin: string;
    landmark?: string;
    phone: string;
    recipient?: string;
  };
  paymentMethod: "cod" | "online";
  /** UPI reference (UTR) typed by a customer who paid to the shop's QR. */
  paymentReference?: string;
  notes?: string;
  items: { variantId: number; qty: number }[];
  saveAddress?: boolean;
};
