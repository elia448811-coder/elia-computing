import Image from "next/image";
import { brandMarkUrl } from "@/data/brand";

type LogoProps = {
  variant?: "for-dark" | "for-light" | "compact";
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function Logo({
  className = "",
  priority = false,
  sizes,
}: LogoProps) {
  return (
    <Image
      src={brandMarkUrl(256)}
      alt="אליה שירותי מחשוב"
      width={1024}
      height={1024}
      className={className}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      sizes={sizes}
      unoptimized
    />
  );
}
