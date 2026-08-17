"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { navLinks } from "@/data/navigation";
import { siteConfig } from "@/data/site";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-300 ${
        scrolled || open
          ? "border-b border-white/10 bg-[#050a14]/90 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container-site flex h-[var(--header-h)] items-center justify-between gap-3">
        <Link
          href="#home"
          className="flex min-w-0 items-center gap-2.5 sm:gap-3"
          aria-label={`${siteConfig.name} - חזרה לראשי`}
          onClick={() => setOpen(false)}
        >
          <Logo
            variant="for-dark"
            className="h-11 w-11 shrink-0 rounded-full object-cover sm:h-14 sm:w-14"
            priority
            sizes="56px"
          />
          <span className="min-w-0 truncate text-sm font-bold leading-tight text-white sm:text-base">
            <span className="sm:hidden">אליה</span>
            <span className="hidden sm:inline">{siteConfig.name}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="ניווט ראשי">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm text-silver transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <a
            href="#contact"
            className="btn btn-primary !hidden px-5 text-sm sm:!inline-flex"
          >
            דברו איתי
          </a>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "סגור" : "תפריט"}</span>
            <span className="relative block h-4 w-5" aria-hidden="true">
              <span
                className={`absolute inset-x-0 top-0 h-0.5 bg-current transition ${
                  open ? "top-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute inset-x-0 top-1.5 h-0.5 bg-current transition ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute inset-x-0 top-3 h-0.5 bg-current transition ${
                  open ? "top-1.5 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`lg:hidden ${open ? "block" : "hidden"}`}
      >
        <button
          type="button"
          className="fixed inset-0 top-[var(--header-h)] z-40 bg-black/55 backdrop-blur-[2px]"
          aria-label="סגירת תפריט"
          onClick={() => setOpen(false)}
        />
        <nav
          className="relative z-50 border-t border-white/10 bg-[#050a14]/98 pb-[max(1rem,var(--safe-bottom))] backdrop-blur-xl"
          aria-label="תפריט מובייל"
        >
          <div className="container-site flex max-h-[calc(100svh-var(--header-h))] flex-col gap-1 overflow-y-auto py-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3.5 text-base font-medium text-silver hover:bg-white/5 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              className="btn btn-primary mt-2 w-full"
              onClick={() => setOpen(false)}
            >
              דברו איתי
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
