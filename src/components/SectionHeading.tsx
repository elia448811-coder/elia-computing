type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "start" | "center";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-start";

  return (
    <div className={`max-w-3xl ${alignClass}`}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold text-electric-bright/85 sm:mb-3 sm:text-sm">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-balance text-[1.65rem] font-bold leading-tight text-white sm:text-4xl lg:text-[2.6rem]">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-pretty text-[0.95rem] leading-relaxed text-silver-muted sm:mt-4 sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
