import { Link } from "react-router-dom";
import { Mail, Phone, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import useAuthStore from "../../store/auth.store";

export default function Footer() {
  const role = useAuthStore((s) => s.role);
  const vendorMode = role === "vendor";
  const year = new Date().getFullYear();

  const linkCls =
    "text-sm font-semibold text-slate-700 transition hover:text-slate-950";

  return (
    <footer className="mt-20 border-t border-slate-200/90 bg-[linear-gradient(180deg,rgba(247,250,255,.95),rgba(236,244,255,.88))]">
      <div className="ec-container py-12">
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="lg:col-span-4 ec-surface p-6">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-slate-900 via-blue-900 to-sky-700 text-white grid place-items-center font-black">
                OD
              </div>
              <div>
                <div className="text-lg font-black text-slate-950">Onlineदुकान</div>
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Professional Ecommerce Experience
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              Modern storefront for customers and vendors. Built with a clean buying flow,
              fast browsing, and role-based dashboard operations.
            </p>

            <div className="mt-5 grid gap-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Mail size={16} className="text-blue-700" /> support@onlinedukan.com
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Phone size={16} className="text-blue-700" /> +91 98765 43210
              </div>
            </div>
          </section>

          <section className="lg:col-span-3 ec-surface p-6">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Shop</h3>
            <div className="mt-4 grid gap-2">
              {!vendorMode ? (
                <>
                  <Link className={linkCls} to="/products">All Products</Link>
                  <Link className={linkCls} to="/products?sort=newest">New Arrivals</Link>
                  <Link className={linkCls} to="/products?sort=rating-desc">Best Sellers</Link>
                  <Link className={linkCls} to="/products?category=Men">Men</Link>
                  <Link className={linkCls} to="/products?category=Women">Women</Link>
                  <Link className={linkCls} to="/products?category=Home">Home</Link>
                </>
              ) : (
                <>
                  <Link className={linkCls} to="/vendor/dashboard">Vendor Dashboard</Link>
                  <Link className={linkCls} to="/vendor/add-product">Add Product</Link>
                  <Link className={linkCls} to="/products?sort=newest">Market View</Link>
                </>
              )}
            </div>
          </section>

          <section className="lg:col-span-2 ec-surface p-6">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Company</h3>
            <div className="mt-4 grid gap-2">
              <Link className={linkCls} to="/company/about-us">About Us</Link>
              <Link className={linkCls} to="/company/careers">Careers</Link>
              <Link className={linkCls} to="/company/press">Press</Link>
              <Link className={linkCls} to="/company/terms">Terms</Link>
              <Link className={linkCls} to="/company/privacy">Privacy</Link>
            </div>
          </section>

          <section className="lg:col-span-3 ec-surface p-6">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Newsletter</h3>
            <p className="mt-3 text-sm text-slate-700">
              Get product launches, offers, and updates directly in your inbox.
            </p>

            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                e.currentTarget.reset();
                window.dispatchEvent(
                  new CustomEvent("ec-toast", {
                    detail: { type: "success", message: "Subscribed successfully!" },
                  })
                );
              }}
            >
              <input
                required
                type="email"
                placeholder="Enter your email"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button type="submit" className="w-full ec-btn-primary rounded-xl">
                Subscribe
              </button>
            </form>
          </section>
        </div>

        <div className="mt-6 ec-surface-soft p-4 grid gap-3 sm:grid-cols-3">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
            <ShieldCheck size={16} className="text-emerald-700" /> Secure Checkout
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
            <Truck size={16} className="text-blue-700" /> Fast Delivery
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
            <RotateCcw size={16} className="text-violet-700" /> Easy Returns
          </div>
        </div>

        <div className="mt-8 border-t border-slate-300/80 pt-4 text-xs font-semibold text-slate-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} Onlineदुकान. All rights reserved.</span>
          <span>Built with React + Vite for production-grade UI workflows.</span>
        </div>
      </div>
    </footer>
  );
}
