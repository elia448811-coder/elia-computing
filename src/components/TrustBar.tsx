import { Reveal } from "@/components/Reveal";
import { trustItems } from "@/data/content";

export function TrustBar() {
  return (
    <section className="relative border-y border-white/8 bg-white/[0.02]" aria-label="יתרונות מרכזיים">
      <div className="container-site grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {trustItems.map((item, index) => (
          <Reveal key={item.title} delayMs={index * 80}>
            <div className="h-full">
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
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
