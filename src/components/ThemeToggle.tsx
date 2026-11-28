"use client";

import { useSyncExternalStore } from "react";
import { themeStorageKey } from "@/lib/theme";

type Theme = "light" | "dark";
const themeEvent = "elia:theme-change";

function storedTheme(): Theme | null {
  try {
    const preference = localStorage.getItem(themeStorageKey);
    return preference === "dark" || preference === "light" ? preference : null;
  } catch {
    return null;
  }
}

function snapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function serverSnapshot(): Theme {
  return "light";
}

function subscribe(notify: () => void) {
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const syncPreference = () => {
    document.documentElement.dataset.theme = storedTheme() ?? (systemTheme.matches ? "dark" : "light");
    notify();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === themeStorageKey || event.key === null) syncPreference();
  };
  const onSystemTheme = () => {
    if (!storedTheme()) syncPreference();
  };
  window.addEventListener(themeEvent, notify);
  window.addEventListener("storage", onStorage);
  systemTheme.addEventListener("change", onSystemTheme);
  return () => {
    window.removeEventListener(themeEvent, notify);
    window.removeEventListener("storage", onStorage);
    systemTheme.removeEventListener("change", onSystemTheme);
  };
}

function toggleTheme() {
  const next = snapshot() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(themeStorageKey, next); } catch { /* The current page can still change theme when storage is unavailable. */ }
  window.dispatchEvent(new Event(themeEvent));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const label = theme === "dark" ? "מעבר למצב בהיר" : "מעבר למצב כהה";
  return (
    <button type="button" className="theme-toggle no-print" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 13.1A9 9 0 0 1 10.9 3.2 9 9 0 1 0 20.8 13.1Z" /></svg>
      )}
    </button>
  );
}
