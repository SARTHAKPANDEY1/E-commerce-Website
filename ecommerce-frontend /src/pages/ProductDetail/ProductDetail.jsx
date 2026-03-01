import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { getProductById } from "../../services/api/products.api";
import { formatCurrency } from "../../utils/formatCurrency";
import useCartStore from "../../store/cart.store";
import useAuthStore from "../../store/auth.store";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);

  const addItem = useCartStore((s) => s.addItem);
  const isCustomer = useAuthStore((s) => s.isCustomer);
  const toggleWishlist = useAuthStore((s) => s.toggleWishlist);
  const isWishlisted = useAuthStore((s) => s.isWishlisted);
  const vendorMode = role === "vendor";
  const customerMode = isCustomer();

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
  });

  if (isLoading) {
    return (
      <div className="ec-container">
        <div className="py-8">
          <div className="h-4 w-24 bg-slate-900/10 rounded-lg animate-pulse" />
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="ec-surface overflow-hidden">
              <div className="aspect-[4/3] bg-slate-900/10 animate-pulse" />
            </div>
            <div className="ec-surface p-6">
              <div className="h-5 w-40 bg-slate-900/10 rounded-lg animate-pulse" />
              <div className="mt-4 h-8 w-3/4 bg-slate-900/10 rounded-xl animate-pulse" />
              <div className="mt-4 h-6 w-32 bg-slate-900/10 rounded-xl animate-pulse" />
              <div className="mt-6 h-10 w-44 bg-slate-900/10 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="ec-container">
        <div className="py-8 ec-surface p-8">
          <div className="text-lg font-black text-slate-950">Product not found</div>
          <p className="mt-2 text-slate-700">
            <Link to="/products" className="font-black underline">
              Browse products
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const inStock = (p.stock ?? 1) > 0;
  const wished = isWishlisted(p.id);

  return (
    <div className="ec-container">
      <div className="py-8">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-black text-slate-800 hover:text-slate-950"
        >
          ← Back
        </button>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* Image */}
          <div className="ec-surface overflow-hidden relative">
            <div className="aspect-[4/3] bg-slate-900/5">
              <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
            </div>

            {customerMode ? (
              <button
                onClick={() => toggleWishlist(p.id)}
                className="absolute right-4 top-4 h-11 w-11 rounded-2xl border border-slate-300/70 bg-slate-900/5 grid place-items-center hover:bg-slate-900/10 transition"
                aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                title={wished ? "Saved" : "Save"}
              >
                <Heart
                  size={20}
                  className={wished ? "text-rose-600 fill-rose-600" : "text-slate-700"}
                />
              </button>
            ) : null}
          </div>

          {/* Info */}
          <div className="ec-surface p-6">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-300/70 bg-slate-900/5 px-3 py-1 text-xs font-black text-slate-800">
                {p.category}
              </span>

              {inStock ? (
                <span className="rounded-full border border-emerald-300 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-800">
                  In stock
                </span>
              ) : (
                <span className="rounded-full border border-rose-300 bg-rose-500/10 px-3 py-1 text-xs font-black text-rose-700">
                  Out of stock
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              {p.title}
            </h1>
            {p.vendorName || p.vendorId ? (
              <div className="mt-2 text-sm font-extrabold text-slate-700">
                Sold by: {p.vendorName || p.vendorId}
              </div>
            ) : null}

            <div className="mt-4 text-2xl font-black text-slate-950">
              {formatCurrency(p.price)}
            </div>

            <p className="mt-3 text-slate-700 leading-relaxed">
              {p.description ||
                "Made for everyday use with a premium finish and long-lasting durability. Perfect for work, travel, and daily essentials."}
            </p>

            {!vendorMode ? (
              <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-3">
                <button
                  onClick={() => addItem(p)}
                  disabled={!inStock}
                  className={
                    inStock
                      ? "ec-btn-primary w-full sm:w-auto"
                      : "rounded-[18px] px-5 py-3 text-sm font-black bg-slate-900/10 text-slate-500 border border-slate-300/70 cursor-not-allowed"
                  }
                >
                  {inStock ? "Add to cart" : "Sold out"}
                </button>

                <Link to="/cart" className="ec-btn-ghost w-full text-center sm:w-auto">
                  Go to cart
                </Link>
              </div>
            ) : (
              <div className="mt-6 inline-flex rounded-[18px] px-5 py-3 text-sm font-black bg-slate-900/10 text-slate-600 border border-slate-300/70">
                Vendor account cannot place orders
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="ec-surface-soft p-4">
                <div className="font-black text-slate-950">Fast Delivery</div>
                <div className="mt-1 text-sm text-slate-700">2–5 business days</div>
              </div>
              <div className="ec-surface-soft p-4">
                <div className="font-black text-slate-950">Easy Returns</div>
                <div className="mt-1 text-sm text-slate-700">7-day return window</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
