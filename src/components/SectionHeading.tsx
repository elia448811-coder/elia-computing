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
        <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-electric-bright/80">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-balance text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.6rem]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-pretty text-base leading-relaxed text-silver-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
