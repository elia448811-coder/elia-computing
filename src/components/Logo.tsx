import Image from "next/image";

type LogoProps = {
  /** for-dark = על רקע כהה | for-light = על רקע בהיר */
  variant?: "for-dark" | "for-light" | "compact";
  className?: string;
  priority?: boolean;
  sizes?: string;
};

const sources = {
  "for-dark": {
    src: "/logos/logo-for-dark.jpg",
    width: 640,
    height: 640,
    alt: "אליה שירותי מחשוב",
  },
  "for-light": {
    src: "/logos/logo-for-light.jpg",
    width: 640,
    height: 640,
    alt: "אליה שירותי מחשוב",
  },
  compact: {
    src: "/logos/logo-for-dark.jpg",
    width: 96,
    height: 96,
    alt: "אליה שירותי מחשוב",
  },
} as const;

export function Logo({
  variant = "compact",
  className = "",
  priority = false,
  sizes,
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
      loading={priority ? "eager" : "lazy"}
      sizes={sizes}
    />
  );
}
