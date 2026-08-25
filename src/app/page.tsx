import { About } from "@/components/About";
import { BusinessSolutions } from "@/components/BusinessSolutions";
import { Contact } from "@/components/Contact";
import { CTABanner } from "@/components/CTABanner";
import { ElectronicBackground } from "@/components/ElectronicBackground";
import { FAQ } from "@/components/FAQ";
import { Hero } from "@/components/Hero";
import { Process } from "@/components/Process";
import { Pricing } from "@/components/Pricing";
import { Services } from "@/components/Services";
import { Statistics } from "@/components/Statistics";
import { TrustBar } from "@/components/TrustBar";
import { Websites } from "@/components/Websites";
import { WhyUs } from "@/components/WhyUs";

export default function Home() {
  return (
    <main id="main" className="site-main">
      <ElectronicBackground />
      <Hero />
      <TrustBar />
      <About />
      <Services />
      <BusinessSolutions />
      <Websites />
      <Pricing />
      <Process />
      <WhyUs />
      <Statistics />
      <FAQ />
      <CTABanner />
      <Contact />
    </main>
  );
}
