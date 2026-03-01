import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import useAuthStore from "../../store/auth.store";
import useCartStore from "../../store/cart.store";
import { listProducts } from "../../services/api/products.api";
import { formatCurrency } from "../../utils/formatCurrency";

export default function Account() {
  const { user, wishlist, toggleWishlist } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);

  // Fetch products once, then filter wishlist items
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", { q: "", category: "All", sort: "relevance" }],
    queryFn: () => listProducts({ q: "", category: "All", sort: "relevance" }),
  });

  const wishlistedProducts = products.filter((p) => (wishlist || []).includes(p.id));

  return (
    <div className="ec-container">
      <div className="py-8">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
          My Account
        </h1>
        <p className="mt-1 text-slate-700">
          Manage your profile, wishlist and order history (backend later).
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Profile */}
          <section className="ec-surface p-6 h-fit">
            {user ? (
              <>
                <div className="text-lg font-black text-slate-950">{user.name}</div>
                <div className="text-slate-700 mt-1">{user.email}</div>

                <div className="mt-6 ec-surface-soft p-5">
                  <div className="font-black text-slate-950">Orders</div>
                  <div className="text-sm text-slate-700 mt-1">
                    No orders yet. When you place an order, it will appear here.
                  </div>
                  <Link to="/products" className="inline-flex mt-4 ec-btn-primary">
                    Start Shopping
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-slate-800">
                Please login to view your account.{" "}
                <Link to="/login" className="font-black underline text-slate-950">
                  Login
                </Link>
              </div>
            )}
          </section>

          {/* Wishlist */}
          <section className="lg:col-span-2 ec-surface p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-lg font-black text-slate-950">Wishlist</div>
                <div className="text-sm text-slate-700 mt-1">
                  Saved items you can quickly add to cart.
                </div>
              </div>

              <div className="text-sm font-extrabold text-slate-700">
                {(wishlist || []).length} saved
              </div>
            </div>

            <div className="mt-5">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="ec-surface-soft p-4">
                      <div className="h-24 bg-slate-900/10 rounded-2xl animate-pulse" />
                      <div className="mt-3 h-4 w-3/4 bg-slate-900/10 rounded-lg animate-pulse" />
                      <div className="mt-2 h-4 w-1/2 bg-slate-900/10 rounded-lg animate-pulse" />
                      <div className="mt-4 h-10 w-32 bg-slate-900/10 rounded-2xl animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (wishlist || []).length === 0 ? (
                <div className="ec-surface-soft p-8 text-center">
                  <div className="text-xl font-black text-slate-950">No items saved yet</div>
                  <p className="mt-2 text-slate-700">
                    Tap the ❤️ icon on products to save them here.
                  </p>
                  <Link to="/products" className="inline-flex mt-6 ec-btn-primary">
                    Browse Products
                  </Link>
                </div>
              ) : wishlistedProducts.length === 0 ? (
                <div className="ec-surface-soft p-8 text-slate-800 font-extrabold">
                  Saved items not found (demo data changed). Try saving again from products page.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {wishlistedProducts.map((p) => {
                    const inStock = (p.stock ?? 1) > 0;

                    return (
                      <div key={p.id} className="ec-surface-soft p-4">
                        <Link to={`/products/${p.id}`} className="block">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <img
                              src={p.image}
                              alt={p.title}
                              className="h-20 w-20 rounded-2xl object-cover bg-slate-900/5"
                            />
                            <div className="flex-1">
                              <div className="font-black text-slate-950 line-clamp-2">
                                {p.title}
                              </div>
                              <div className="mt-1 text-sm font-extrabold text-slate-950">
                                {formatCurrency(p.price)}
                              </div>
                              {p.vendorName || p.vendorId ? (
                                <div className="mt-1 text-xs font-black text-slate-700">
                                  Sold by: {p.vendorName || p.vendorId}
                                </div>
                              ) : null}
                              <div className="mt-1 text-xs font-black text-slate-700">
                                {inStock ? "In stock" : "Out of stock"}
                              </div>
                            </div>
                          </div>
                        </Link>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
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

                          <button
                            onClick={() => toggleWishlist(p.id)}
                            className="inline-flex items-center gap-2 rounded-[18px] px-4 py-3 text-sm font-black border border-slate-300/70 bg-slate-900/5 text-slate-900 hover:bg-slate-900/10 transition"
                          >
                            <Heart size={16} className="text-rose-600 fill-rose-600" />
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
