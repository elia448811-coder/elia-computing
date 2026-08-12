import { Reveal } from "@/components/Reveal";
import { statsItems } from "@/data/content";

export function Statistics() {
  return (
    <section className="relative border-y border-white/8 bg-white/[0.02]" aria-label="תחומי התמחות">
      <div className="container-site grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {statsItems.map((item, index) => (
          <Reveal key={item.label} delayMs={index * 70}>
            <div className="text-center lg:text-start">
              <p className="text-2xl font-bold tracking-wide text-electric-bright">
                {item.label}
              </p>
              <p className="mt-2 text-sm text-silver-muted">{item.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
