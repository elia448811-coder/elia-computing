import Link from "next/link";
import { Logo } from "@/components/Logo";
import { footerQuickLinks, legalLinks } from "@/data/navigation";
import { services } from "@/data/services";
import { siteConfig } from "@/data/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/10 bg-[#040912]" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        תחתית האתר
      </h2>
      <div className="container-site grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <Logo
              variant="for-dark"
              className="h-16 w-16 rounded-full object-cover"
              sizes="64px"
            />
            <div>
              <p className="font-bold text-white">{siteConfig.name}</p>
              <p className="text-sm text-silver-muted">{siteConfig.slogan}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold tracking-wide text-electric-bright">
            קישורים מהירים
          </p>
          <ul className="space-y-2 text-sm text-silver-muted">
            {footerQuickLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="hover:text-white">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold tracking-wide text-electric-bright">
            שירותים
          </p>
          <ul className="space-y-2 text-sm text-silver-muted">
            {services.slice(0, 6).map((service) => (
              <li key={service.id}>
                <a href="#services" className="hover:text-white">
                  {service.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold tracking-wide text-electric-bright">
            פרטי קשר
          </p>
          <ul className="space-y-2 text-sm text-silver-muted">
            {siteConfig.contact.phone ? (
              <li>
                <a href={`tel:${siteConfig.contact.phone}`} className="hover:text-white">
                  {siteConfig.contact.phone}
                </a>
              </li>
            ) : null}
            {siteConfig.contact.email ? (
              <li>
                <a href={`mailto:${siteConfig.contact.email}`} className="hover:text-white">
                  {siteConfig.contact.email}
                </a>
              </li>
            ) : null}
            {siteConfig.contact.whatsapp ? (
              <li>
                <a
                  href={`https://wa.me/${siteConfig.contact.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp
                </a>
              </li>
            ) : null}
            {!siteConfig.contact.phone &&
            !siteConfig.contact.email &&
            !siteConfig.contact.whatsapp ? (
              <li>פרטי הקשר יעודכנו בקרוב</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="container-site flex flex-col gap-4 py-6 text-sm text-silver-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.name}. כל הזכויות שמורות.
          </p>
          <ul className="flex flex-wrap gap-4">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
