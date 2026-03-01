import { Link, useParams } from "react-router-dom";

const companyPages = {
  "about-us": {
    title: "About Onlineदुकान",
    subtitle: "Building a reliable, modern ecommerce experience for customers and vendors.",
    body: [
      "Onlineदुकान is a role-based ecommerce platform built for clean shopping flows and practical seller operations.",
      "Our focus is to deliver a fast storefront, clear product discovery, and a seller dashboard that helps vendors manage inventory and performance with confidence.",
    ],
  },
  careers: {
    title: "Careers at Onlineदुकान",
    subtitle: "Work on product, commerce, and scale-focused systems.",
    body: [
      "We are growing a product-first team across frontend engineering, backend APIs, design systems, and product operations.",
      "If you care about performance, user trust, and building production-grade ecommerce experiences, we'd like to hear from you.",
    ],
  },
  press: {
    title: "Press & Media",
    subtitle: "News, launches, and product updates from Onlineदुकान.",
    body: [
      "For media inquiries, product launch stories, and collaboration requests, contact us via press@onlinedukan.com.",
      "We regularly share platform updates covering customer experience, seller tooling, and roadmap milestones.",
    ],
  },
  terms: {
    title: "Terms of Use",
    subtitle: "Platform usage terms for customers and vendors.",
    body: [
      "By using Onlineदुकान, you agree to follow applicable marketplace rules, listing standards, and payment and checkout policies.",
      "Terms cover account access, acceptable usage, content ownership, and responsibilities for both customer and vendor workflows.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How Onlineदुकान handles your data.",
    body: [
      "We collect only the data required to operate shopping, checkout, and seller dashboard experiences.",
      "Your information is used to improve platform reliability and support, and is handled with a privacy-first approach.",
    ],
  },
};

export default function CompanyInfo() {
  const { page } = useParams();
  const content = companyPages[page] || null;

  if (!content) {
    return (
      <div className="ec-container">
        <div className="py-10">
          <div className="ec-surface p-8 text-center">
            <h1 className="text-2xl font-black text-slate-950">Page not found</h1>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              The company page you requested is not available.
            </p>
            <Link to="/" className="inline-flex mt-5 ec-btn-primary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ec-container">
      <div className="py-10">
        <section className="ec-surface p-6 sm:p-8">
          <div className="ec-pill inline-flex">Onlineदुकान Company</div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
            {content.title}
          </h1>
          <p className="mt-2 text-slate-700">{content.subtitle}</p>

          <div className="mt-6 space-y-4">
            {content.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed font-semibold text-slate-700">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/products" className="ec-btn-primary">Browse Products</Link>
            <Link to="/" className="ec-btn-ghost">Back to Home</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
