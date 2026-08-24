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
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-electric/15 bg-electric/[0.06] px-3 py-1.5 text-xs font-extrabold tracking-[0.14em] text-electric-bright">
          <span className="h-1.5 w-1.5 rounded-full bg-electric" aria-hidden="true" />
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-balance text-3xl font-extrabold leading-[1.12] tracking-[-0.025em] text-white sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-pretty text-base leading-8 text-silver-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
