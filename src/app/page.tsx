import { Contact } from "@/components/Contact";
import { CTABanner } from "@/components/CTABanner";
import { ElectronicBackground } from "@/components/ElectronicBackground";
import { FAQ } from "@/components/FAQ";
import { Hero } from "@/components/Hero";
import { Process } from "@/components/Process";
import { Pricing } from "@/components/Pricing";
import { Services } from "@/components/Services";
import { TrustBar } from "@/components/TrustBar";

export default function Home() {
  return (
    <main id="main" className="site-main">
      <ElectronicBackground />
      <Hero />
      <TrustBar />
      <Services />
      <Pricing />
      <Process />
      <FAQ />
      <CTABanner />
      <Contact />
    </main>
  );
}
