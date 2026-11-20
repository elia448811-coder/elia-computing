"use client";
import type { ReactNode } from "react";
export function PlanContactLink({
  plan,
  className,
  children,
}: {
  plan: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      href="#contact"
      className={className}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("elia:select-service", { detail: `חבילת ${plan}` }),
        )
      }
    >
      {children}
    </a>
  );
}
