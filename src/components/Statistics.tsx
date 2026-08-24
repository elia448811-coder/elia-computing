import { Reveal } from "@/components/Reveal";
import { statsItems } from "@/data/content";

export function Statistics() {
  return (
    <section className="relative border-y border-white/8 bg-[#07111f]/70" aria-label="תחומי התמחות">
      <div className="container-site grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {statsItems.map((item, index) => (
          <Reveal key={item.label} delayMs={index * 70}>
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-5 py-5 text-center lg:text-start">
              <p className="text-xl font-extrabold tracking-wide text-white">
                {item.label}
              </p>
              <p className="mt-2 text-sm text-electric-bright">{item.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
