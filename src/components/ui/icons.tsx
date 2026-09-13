import { cn } from "@/lib/cn";

/**
 * Hand-rolled icon set — one stroke weight, one grid, no icon dependency.
 * Keeping them here means the bundle ships only the ~28 glyphs the shop uses.
 */
type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, className, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
);

export const IconBag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 8h15l-1 12h-13l-1-12Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </Svg>
);

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M4.8 20c.7-3.6 3.6-5.6 7.2-5.6s6.5 2 7.2 5.6" />
  </Svg>
);

export const IconHeart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20s-7.5-4.4-7.5-9.2A4.3 4.3 0 0 1 12 8.1a4.3 4.3 0 0 1 7.5 2.7C19.5 15.6 12 20 12 20Z" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h11" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Svg>
);
export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Svg>
);
export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5.5 9.5 6.5 6 6.5-6" />
  </Svg>
);
export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h15m-5.5-5.5L19.5 12 13.5 17.5" />
  </Svg>
);
export const IconArrowUpRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 17 17 7m-7.5 0H17v7.5" />
  </Svg>
);

export const IconWhatsapp = ({ size = 18, className, ...rest }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className={cn("shrink-0", className)} {...rest}>
    <path d="M12.04 2.5a9.4 9.4 0 0 0-8.05 14.25L2.5 21.5l5.15-1.35A9.4 9.4 0 1 0 12.04 2.5Zm0 1.7a7.7 7.7 0 1 1-3.94 14.32l-.28-.17-3.05.8.81-2.97-.18-.29A7.7 7.7 0 0 1 12.04 4.2Zm-3.3 3.6c-.18 0-.47.07-.72.32-.25.25-.95.93-.95 2.27 0 1.33.97 2.62 1.11 2.8.14.18 1.9 3.02 4.7 4.11 2.32.92 2.8.74 3.3.69.52-.05 1.65-.67 1.88-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.52-.32-.27-.14-1.65-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.27-.7.9-.86 1.08-.16.18-.32.2-.59.07-.27-.14-1.16-.43-2.2-1.36-.82-.72-1.37-1.62-1.53-1.89-.16-.27-.02-.42.12-.56.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.6-1.5-.83-2.04-.2-.48-.41-.49-.56-.5h-.24Z" />
  </svg>
);

export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 3.5h3l1.2 3.4-1.9 1.5a10.5 10.5 0 0 0 4.8 4.8l1.5-1.9 3.4 1.2v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
  </Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </Svg>
);

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s6.5-6.1 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 14.9 12 21 12 21Z" />
    <circle cx="12" cy="10.4" r="2.3" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3.2 2" />
  </Svg>
);

export const IconStar = ({ size = 14, className, filled, ...rest }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} aria-hidden="true" className={cn("shrink-0", className)} {...rest}>
    <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.8l5.9-.8L12 3.6Z" strokeLinejoin="round" />
  </svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const IconCheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.2 12.4 2.5 2.5 5.1-5.6" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.2 20.6 19H3.4L12 4.2Z" />
    <path d="M12 10v4" />
    <path d="M12 16.6h.01" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8h.01" />
  </Svg>
);

export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 7h10v9h-10z" />
    <path d="M12.5 10.5h4l3 3v2.5h-7z" />
    <circle cx="6.5" cy="17.5" r="1.6" />
    <circle cx="16.5" cy="17.5" r="1.6" />
  </Svg>
);

export const IconReturn = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10.5A8 8 0 1 1 6 17" />
    <path d="M3.5 5.5v5h5" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2 19 6v5.6c0 4.3-3 7.4-7 9.2-4-1.8-7-4.9-7-9.2V6l7-2.8Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Svg>
);

export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
  </Svg>
);

export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 6h17M6.5 12h11M10 18h4" />
  </Svg>
);

export const IconSort = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4.5v15M7 19.5 3.8 16M17 19.5v-15M17 4.5 20.2 8" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 12h13" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 6.5h15M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5" />
    <path d="M6.5 6.5 7.6 20a1.5 1.5 0 0 0 1.5 1.4h5.8a1.5 1.5 0 0 0 1.5-1.4l1.1-13.5" />
    <path d="M10.5 10.5v7M13.5 10.5v7" />
  </Svg>
);

export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
    <path d="m14.5 5.5 4 4" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
  </Svg>
);

export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4.5 17 4.6-4.4 3.4 3.1 2.8-2.4 4.2 3.9" />
  </Svg>
);

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 16V4.5M8 8l4-3.5L16 8" />
    <path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" />
  </Svg>
);

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12S18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
);

export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4l16 16" />
    <path d="M9.6 6.2A9.5 9.5 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-2.6 3.4M6.4 8.1A16.6 16.6 0 0 0 2.5 12S6 18.2 12 18.2c1 0 1.9-.16 2.7-.43" />
  </Svg>
);

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
  </Svg>
);

export const IconBox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 20.5 8v8L12 20.5 3.5 16V8L12 3.5Z" />
    <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" />
  </Svg>
);

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19.5h16" />
    <path d="M6.5 16V11M11 16V6.5M15.5 16v-6M20 16v-9" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8.5" r="3.2" />
    <path d="M3.5 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
    <path d="M16.5 6.4a3 3 0 0 1 0 5.6M18 14.8c2 .6 3.3 2.2 3.8 4.4" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M12 2.8v2.3M12 18.9v2.3M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.8 12h2.3M18.9 12h2.3M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7" />
  </Svg>
);

export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3" />
    <path d="M10.5 8 6.5 12l4 4M6.5 12H16" />
  </Svg>
);

export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12.6 3.5H20v7.4l-8.3 8.3a2 2 0 0 1-2.8 0l-4.6-4.6a2 2 0 0 1 0-2.8l8.3-8.3Z" />
    <circle cx="16.4" cy="7.2" r="1.3" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.4-5.7" />
    <path d="M20.5 3.5V9H15" />
  </Svg>
);

export const IconDrag = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="6" r="1.1" fill="currentColor" />
    <circle cx="15" cy="6" r="1.1" fill="currentColor" />
    <circle cx="9" cy="12" r="1.1" fill="currentColor" />
    <circle cx="15" cy="12" r="1.1" fill="currentColor" />
    <circle cx="9" cy="18" r="1.1" fill="currentColor" />
    <circle cx="15" cy="18" r="1.1" fill="currentColor" />
  </Svg>
);

export const IconInstagram = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="1" fill="currentColor" />
  </Svg>
);

export const IconFacebook = ({ size = 18, className, ...rest }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className={cn("shrink-0", className)} {...rest}>
    <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.25-1.5 1.55-1.5H16.6V4.4A20 20 0 0 0 14.3 4.3c-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" />
  </svg>
);

export const IconZoomIn = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M11 8.5v5M8.5 11h5M16 16l4.5 4.5" />
  </Svg>
);

export const IconChevronUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 15 6-6 6 6" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="1.6" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);

export const IconRupee = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4.5h10M7 9h10M16.5 4.5c0 3.4-2.6 4.5-5.5 4.5H7l7.5 10" />
  </Svg>
);

export const IconCard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
    <path d="M2.5 10h19M6 14.5h4" />
  </Svg>
);

export const IconCash = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6 9.5v5M18 9.5v5" />
  </Svg>
);

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v10m0 0 4-4m-4 4-4-4M4.5 18.5h15" />
  </Svg>
);

export const IconPrinter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 9V4.5h10V9" />
    <rect x="3.5" y="9" width="17" height="7" rx="1.6" />
    <path d="M7 13.5h10V20H7z" />
  </Svg>
);

export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 5h5v5M19 5l-7.5 7.5" />
    <path d="M18 14v4.5a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H11" />
  </Svg>
);

export const IconSliders = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
    <circle cx="15" cy="8" r="2" />
    <circle cx="9" cy="16" r="2" />
  </Svg>
);

export const IconCamera = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8.5h3l1.5-2.5h8L17.5 8.5h3v11h-17z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Svg>
);

export const IconRuler = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="8" width="19" height="8" rx="1.4" />
    <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
  </Svg>
);

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 4 1.4 5.6 2 6.4H4c.6-.8 2-2.4 2-6.4Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Svg>
);
