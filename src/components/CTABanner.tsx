import { Reveal } from "@/components/Reveal";

export function CTABanner() {
  return (
    <section className="section-y relative pt-0" aria-labelledby="cta-title">
      <div className="container-site">
        <Reveal>
          <div className="contact-banner">
            <div>
              <h2 id="cta-title" className="section-title">מה תרצו לעשות ביחד?</h2>
              <p className="mt-4 text-lg text-silver-muted">אפשר להתחיל בשיחה.</p>
            </div>
            <a href="#contact" className="btn btn-primary">דברו איתי <span aria-hidden="true">↙</span></a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
