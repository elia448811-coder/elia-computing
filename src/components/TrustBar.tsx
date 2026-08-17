import { Reveal } from "@/components/Reveal";
import { trustItems } from "@/data/content";

export function TrustBar() {
  return (
    <section className="relative border-y border-white/8 bg-white/[0.02]" aria-label="יתרונות מרכזיים">
      <div className="container-site grid gap-5 py-8 sm:grid-cols-2 sm:gap-6 sm:py-10 lg:grid-cols-4 lg:gap-8">
        {trustItems.map((item, index) => (
          <Reveal key={item.title} delayMs={index * 80}>
            <div className="h-full border-r-2 border-r-electric/35 pr-3 sm:border-r-0 sm:pr-0">
              <h3 className="text-base font-bold text-white sm:text-lg">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-silver-muted sm:mt-2">
                {item.text}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
