import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import useCartStore from "../../store/cart.store";
import useAuthStore from "../../store/auth.store";

function Rating({ value }) {
  const v = Number(value || 0);
  const full = Math.round(v);
  const stars = Array.from({ length: 5 }).map((_, i) => (i < full ? "★" : "☆")).join("");
  return (
    <div className="flex items-center gap-2">
      <span className="text-amber-500 text-sm leading-none">{stars}</span>
      <span className="text-xs font-black text-slate-700">{v.toFixed(1)}</span>
    </div>
  );
}

export default function ProductCard({ p }) {
  const addItem = useCartStore((s) => s.addItem);
  const role = useAuthStore((s) => s.role);
  const isCustomer = useAuthStore((s) => s.isCustomer);
  const toggleWishlist = useAuthStore((s) => s.toggleWishlist);
  const isWishlisted = useAuthStore((s) => s.isWishlisted);
  const vendorMode = role === "vendor";
  const customerMode = isCustomer();

  const wished = isWishlisted(p.id);
  const inStock = (p.stock ?? 1) > 0;

  return (
    <div className="group ec-surface overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,.16)]">
      <div className="relative">
        <Link to={`/products/${p.id}`} className="block">
          <div className="aspect-[4/3] bg-slate-900/5 overflow-hidden">
            <img
              src={p.image}
              alt={p.title}
              className="h-full w-full object-cover group-hover:scale-[1.06] transition duration-500"
              loading="lazy"
            />
          </div>
        </Link>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="ec-pill">
            {p.category}
          </span>
          {!inStock ? (
            <span className="rounded-full border border-rose-300 bg-rose-500/10 px-2.5 py-1 text-xs font-black text-rose-700">
              Out of stock
            </span>
          ) : null}
        </div>

        {/* Wishlist */}
        {customerMode ? (
          <button
            onClick={() => toggleWishlist(p.id)}
            className="absolute right-3 top-3 h-10 w-10 rounded-2xl border border-slate-300/70 bg-slate-900/5 grid place-items-center hover:bg-slate-900/10 transition"
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            title={wished ? "Saved" : "Save"}
          >
            <Heart
              size={18}
              className={wished ? "text-rose-600 fill-rose-600" : "text-slate-700"}
            />
          </button>
        ) : null}
      </div>

      <div className="p-5">
        <Link
          to={`/products/${p.id}`}
          className="block font-black leading-snug text-slate-950 line-clamp-2 text-[1.02rem]"
          title={p.title}
        >
          {p.title}
        </Link>

        <div className="mt-2 flex items-center justify-between gap-3">
          <Rating value={p.rating ?? 4.2} />
          {inStock ? (
            <span className="text-xs font-black text-emerald-700">In stock</span>
          ) : (
            <span className="text-xs font-black text-slate-600">Coming soon</span>
          )}
        </div>
        {p.vendorName || p.vendorId ? (
          <div className="mt-2 text-xs font-extrabold text-slate-700">
            Sold by: {p.vendorName || p.vendorId}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-black tracking-tight">{formatCurrency(p.price)}</div>
            <div className="text-xs text-slate-600">Inclusive of taxes</div>
          </div>

          {!vendorMode ? (
            <button
              onClick={() => addItem(p)}
              disabled={!inStock}
              className={
                inStock
                  ? "ec-btn-primary"
                  : "rounded-[18px] px-4 py-3 text-sm font-black bg-slate-900/10 text-slate-500 border border-slate-300/70 cursor-not-allowed"
              }
            >
              {inStock ? "Add to cart" : "Sold out"}
            </button>
          ) : (
            <div className="rounded-[18px] px-4 py-3 text-xs font-black bg-slate-900/10 text-slate-600 border border-slate-300/70">
              Vendor view only
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
