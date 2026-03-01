import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Truck, BadgePercent, ArrowRight } from "lucide-react";
import { listProducts, listCategories } from "../../services/api/products.api";
import ProductGrid from "../../components/product/ProductGrid";

export default function Home() {
  const { data: products = [] } = useQuery({
    queryKey: ["products", { q: "", category: "All", sort: "relevance" }],
    queryFn: () => listProducts({ q: "", category: "All", sort: "relevance" }),
  });
  const { data: categories = ["All"] } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  const featured = products.slice(0, 6);
  const newest = [...products]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);
  const topCategories = categories.filter((c) => c !== "All").slice(0, 6);

  return (
    <div className="ec-container">
      <div className="py-6 sm:py-8 space-y-8 sm:space-y-10">
        <section className="ec-surface overflow-hidden p-5 sm:p-10 relative">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative grid gap-6 sm:gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="ec-pill inline-flex">Spring Collection 2026</div>
              <h1 className="mt-3 text-2xl sm:text-5xl font-black tracking-tight text-slate-950 leading-tight">
                Premium styles for everyday shopping.
              </h1>
              <p className="mt-4 text-slate-700 leading-relaxed">
                Discover high-quality products with clean navigation, quick checkout,
                and trusted delivery support.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/products" className="ec-btn-primary inline-flex items-center gap-2">
                  Start Shopping <ArrowRight size={16} />
                </Link>
                <Link to="/products?sort=newest" className="ec-btn-ghost">
                  View New Arrivals
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {newest.map((item) => (
                <Link
                  key={item.id}
                  to={`/products/${item.id}`}
                  className="rounded-2xl border border-slate-200 bg-white/70 p-2 hover:bg-white transition"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-28 w-full rounded-xl object-cover"
                  />
                  <div className="mt-2 line-clamp-1 text-xs font-black text-slate-900">
                    {item.title}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <TrustItem icon={<Truck size={16} className="text-blue-700" />} label="Free Delivery" text="On orders above ₹999" />
          <TrustItem icon={<ShieldCheck size={16} className="text-emerald-700" />} label="Secure Payments" text="Protected checkout flow" />
          <TrustItem icon={<BadgePercent size={16} className="text-violet-700" />} label="Smart Deals" text="Daily offers on top picks" />
        </section>

        <section className="ec-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950">Shop by Category</h2>
              <p className="mt-1 text-sm text-slate-700">Browse curated categories quickly.</p>
            </div>
            <Link to="/products" className="text-sm font-black text-slate-700 hover:text-slate-950">
              Explore all
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topCategories.map((category) => (
              <Link
                key={category}
                to={`/products?category=${encodeURIComponent(category)}`}
                className="rounded-2xl border border-slate-200 bg-white/75 px-4 py-4 text-sm font-black text-slate-900 transition hover:-translate-y-0.5 hover:bg-white"
              >
                {category}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-3 mb-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950">Featured Picks</h2>
            <Link to="/products" className="text-sm font-black text-slate-700 hover:text-slate-900">
              View all products →
            </Link>
          </div>

          <p className="text-sm text-slate-600 mb-5">
            High-performing products selected from the latest catalog.
          </p>

          <ProductGrid items={featured} />
        </section>
      </div>
    </div>
  );
}

function TrustItem({ icon, label, text }) {
  return (
    <div className="ec-surface-soft p-4">
      <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xs font-semibold text-slate-700">{text}</div>
    </div>
  );
}
