import { Reveal } from "@/components/Reveal";
import { statsItems } from "@/data/content";

export function Statistics() {
  return (
    <section className="relative border-y border-white/8 bg-white/[0.02]" aria-label="תחומי התמחות">
      <div className="container-site grid gap-5 py-9 sm:grid-cols-2 sm:gap-6 sm:py-12 lg:grid-cols-4">
        {statsItems.map((item, index) => (
          <Reveal key={item.label} delayMs={index * 70}>
            <div className="text-center sm:text-start lg:text-start">
              <p className="text-xl font-bold tracking-wide text-electric-bright sm:text-2xl">
                {item.label}
              </p>
              <p className="mt-1.5 text-sm text-silver-muted sm:mt-2">{item.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
