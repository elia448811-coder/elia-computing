import { Reveal } from "@/components/Reveal";
import { trustItems } from "@/data/content";

export function TrustBar() {
  return (
    <section className="trust-bar relative border-y border-white/8" aria-label="יתרונות מרכזיים">
      <div className="container-site grid gap-px overflow-hidden  sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map((item, index) => (
          <Reveal key={item.title} delayMs={index * 80}>
            <div className="trust-item h-full px-6 py-8">
              <span className="text-xs font-black tracking-[0.18em] text-electric/70">0{index + 1}</span>
              <h3 className="mt-4 text-lg font-extrabold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-silver-muted">
                {item.text}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
