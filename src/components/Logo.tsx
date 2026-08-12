import Image from "next/image";

type LogoProps = {
  variant?: "mark" | "full-dark" | "full-light" | "compact";
  className?: string;
  priority?: boolean;
};

const sources = {
  mark: { src: "/logos/logo-mark.svg", width: 200, height: 200, alt: "אליה שירותי מחשוב" },
  "full-dark": {
    src: "/logos/logo-full-dark.svg",
    width: 280,
    height: 64,
    alt: "אליה שירותי מחשוב",
  },
  "full-light": {
    src: "/logos/logo-full-light.svg",
    width: 280,
    height: 64,
    alt: "אליה שירותי מחשוב",
  },
  compact: {
    src: "/logos/logo-mark.svg",
    width: 44,
    height: 44,
    alt: "אליה שירותי מחשוב",
  },
} as const;

export function Logo({
  variant = "compact",
  className = "",
  priority = false,
}: LogoProps) {
  const asset = sources[variant];

  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      className={className}
      priority={priority}
    />
  );
}
