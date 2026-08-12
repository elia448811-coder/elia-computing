import { About } from "@/components/About";
import { BusinessSolutions } from "@/components/BusinessSolutions";
import { Contact } from "@/components/Contact";
import { CTABanner } from "@/components/CTABanner";
import { FAQ } from "@/components/FAQ";
import { Hero } from "@/components/Hero";
import { Process } from "@/components/Process";
import { Projects } from "@/components/Projects";
import { Services } from "@/components/Services";
import { Statistics } from "@/components/Statistics";
import { TrustBar } from "@/components/TrustBar";
import { Websites } from "@/components/Websites";
import { WhyUs } from "@/components/WhyUs";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <TrustBar />
      <About />
      <Services />
      <BusinessSolutions />
      <Websites />
      <Process />
      <WhyUs />
      <Statistics />
      <Projects />
      <FAQ />
      <CTABanner />
      <Contact />
    </main>
  );
}
