import { handle } from "@/server/http/handler";
import { readSettings } from "@/server/repositories/settings.repository";
import { paymentOptions } from "@/server/services/payments.service";

/**
 * The public slice of settings for client chrome (WhatsApp button, delivery
 * copy, cart rules). Deliberately a whitelist: admin fields such as the GST
 * number or policy internals are not repeated here, and nothing secret exists
 * in this payload by construction.
 */
const PUBLIC_KEYS = [
  "shopName",
  "tagline",
  "logoText",
  "logoImage",
  "phone",
  "whatsapp",
  "email",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pin",
  "mapUrl",
  "hours",
  "instagram",
  "facebook",
  "youtube",
  "whatsappEnabled",
  "whatsappGreeting",
  "announcement",
  "announcementEnabled",
  "deliveryFee",
  "freeDeliveryOver",
  "minOrderValue",
  "codFee",
  "codEnabled",
  "onlineEnabled",
  "onlineMode",
  "upiId",
  "upiPayeeName",
  "upiQrImage",
  "paymentInstructions",
  "utrRequired",
  "dispatchDays",
  "deliveryDaysMin",
  "deliveryDaysMax",
  "returnWindowDays",
] as const;

export const GET = handle({}, async () => {
  const settings = readSettings();
  const publicSettings: Record<string, unknown> = {};
  for (const key of PUBLIC_KEYS) publicSettings[key] = settings[key];
  return { settings: publicSettings, payments: paymentOptions(settings) };
});
