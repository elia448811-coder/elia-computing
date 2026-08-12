"use client";

import { siteConfig } from "@/data/site";

export function WhatsAppFloat() {
  if (!siteConfig.contact.whatsapp) {
    return null;
  }

  const href = `https://wa.me/${siteConfig.contact.whatsapp}?text=${encodeURIComponent(
    "שלום, אשמח לקבל פרטים על השירותים שלכם",
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 left-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#0b1729]/85 text-electric-bright shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:border-electric/40 hover:shadow-[var(--glow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric"
      aria-label="יצירת קשר בוואטסאפ"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.96.52 3.8 1.44 5.4L2 22l4.93-1.55a9.9 9.9 0 0 0 5.11 1.4h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2Zm5.77 14.05c-.24.67-1.4 1.23-1.93 1.31-.5.07-1.12.1-1.81-.11-.42-.13-.95-.31-1.64-.6-2.89-1.24-4.77-4.14-4.91-4.33-.14-.19-1.16-1.54-1.16-2.94 0-1.4.74-2.09 1-2.37.26-.28.57-.35.76-.35h.55c.17 0 .41-.07.64.49.24.58.8 2 .87 2.14.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.17-.3.38-.42.51-.14.14-.28.29-.12.56.16.28.71 1.17 1.53 1.9 1.05.93 1.93 1.22 2.21 1.36.28.14.44.12.6-.07.17-.19.7-.81.89-1.09.19-.28.38-.23.64-.14.26.1 1.67.79 1.95.93.28.14.47.21.54.33.07.12.07.69-.17 1.36Z" />
      </svg>
    </a>
  );
}
