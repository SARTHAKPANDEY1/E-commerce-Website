import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Search, User, Heart, LayoutDashboard, PlusSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useCartStore from "../../store/cart.store";
import useAuthStore from "../../store/auth.store";
import { listProducts } from "../../services/api/products.api";
import { formatCurrency } from "../../utils/formatCurrency";

export default function Header() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const { items } = useCartStore();
  const { user, logout, wishlist = [], role } = useAuthStore();
  const vendorMode = role === "vendor";

  const cartCount = useMemo(
    () => items.reduce((sum, i) => sum + (i.qty || 0), 0),
    [items]
  );

  const wishlistCount = useMemo(() => (wishlist?.length ? wishlist.length : 0), [wishlist]);

  const q = params.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(q);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  useEffect(() => {
    setSearchTerm(q);
  }, [q]);

  useEffect(() => {
    const value = searchTerm.trim();
    if (value.length < 2) {
      setSuggestions([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      const items = await listProducts({ q: value, category: "All", sort: "relevance" });
      setSuggestions(items.slice(0, 6));
    }, 180);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    function handleOutsideClick(event) {
      const inDesktop = desktopSearchRef.current?.contains(event.target);
      const inMobile = mobileSearchRef.current?.contains(event.target);
      if (!inDesktop && !inMobile) setShowSuggestions(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function runSearch(value) {
    const trimmed = (value || "").trim();

    const next = new URLSearchParams(params);
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    next.delete("page");

    setParams(next);
    navigate("/products?" + next.toString());
    setShowSuggestions(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    runSearch(searchTerm);
  }

  function handleSuggestionClick(product) {
    setSearchTerm(product.title);
    setShowSuggestions(false);
    navigate(`/products/${product.id}`);
  }

  const desktopNavClass = ({ isActive }) =>
    "relative text-sm font-bold px-1 py-2 transition-all duration-300 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-full after:origin-left after:transition-transform after:duration-300 " +
    (isActive
      ? "text-slate-950 after:scale-x-0 after:bg-gradient-to-r after:from-blue-700 after:to-sky-500 hover:after:scale-x-100"
      : "text-slate-600 after:scale-x-0 after:bg-gradient-to-r after:from-blue-700 after:to-sky-500 hover:text-slate-900 hover:after:scale-x-100");

  const mobileLinkClass =
    "rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-black text-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-sm";
  const mobileActionBtnClass =
    "rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-black text-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-sm";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-[linear-gradient(180deg,rgba(250,252,255,0.95),rgba(244,248,255,0.9))] backdrop-blur-xl">
      <div className="ec-container">
        <div className="py-3 flex items-center gap-3 sm:gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-900 via-blue-900 to-sky-700 text-white grid place-items-center font-black shadow-md shadow-slate-900/25">
              OD
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="font-black text-slate-950 tracking-tight">Onlineदुकान</div>
              <div className="text-[11px] text-slate-600 uppercase tracking-[0.08em]">Aapka passion humara style</div>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 hidden md:block">
            <div
              ref={desktopSearchRef}
              className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white/75 px-3 py-2 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow"
            >
              <Search size={17} className="text-slate-500" />
              <input
                name="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search products"
                className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-500"
              />
              {showSuggestions && suggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-xl border border-slate-200 bg-white shadow-lg">
                  {suggestions.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSuggestionClick(product)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-slate-900">{product.title}</span>
                        <span className="text-xs font-semibold text-slate-600">{product.category}</span>
                      </span>
                      <span className="shrink-0 text-xs font-black text-slate-800">
                        {formatCurrency(product.price)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </form>

          <nav className="hidden lg:flex items-center gap-4 xl:gap-5">
            <NavLink to="/" className={desktopNavClass}>Home</NavLink>
            {!vendorMode ? <NavLink to="/products" className={desktopNavClass}>Shop</NavLink> : null}
            {!vendorMode ? <NavLink to="/products?sort=newest" className={desktopNavClass}>New Arrivals</NavLink> : null}
            {!vendorMode ? <NavLink to="/products?sort=rating-desc" className={desktopNavClass}>Best Sellers</NavLink> : null}
            {user && !vendorMode ? <NavLink to="/account" className={desktopNavClass}>My Account</NavLink> : null}
            {vendorMode ? <NavLink to="/vendor/dashboard" className={desktopNavClass}>Dashboard</NavLink> : null}
            {vendorMode ? <NavLink to="/vendor/add-product" className={desktopNavClass}>Add Product</NavLink> : null}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 shadow-sm">
                <span className="text-sm font-bold text-slate-800">{String(user.name || "User").split(" ")[0]}</span>
                <button
                  onClick={logout}
                  className="rounded-full px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-900/5"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm font-black text-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-sm"
              >
                <User size={16} />
                Login
              </Link>
            )}

            {!vendorMode ? (
              <Link
                to="/account"
                className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white/75 text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow"
                aria-label="Open wishlist"
                title="Wishlist"
              >
                <Heart size={17} className="text-rose-600" />
                {wishlistCount > 0 ? (
                  <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] grid place-items-center font-black">
                    {wishlistCount}
                  </span>
                ) : null}
              </Link>
            ) : (
              <Link
                to="/vendor/dashboard"
                className="hidden md:inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white/75 text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow"
                title="Vendor Dashboard"
              >
                <LayoutDashboard size={17} />
              </Link>
            )}

            {!vendorMode ? (
              <Link
                to="/cart"
                className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-slate-900 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-md"
                aria-label="Open cart"
                title="Cart"
              >
                <ShoppingCart size={17} />
                {cartCount > 0 ? (
                  <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] grid place-items-center font-black">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            ) : (
              <Link
                to="/vendor/add-product"
                className="hidden md:inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-slate-900 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-md"
                title="Add Product"
              >
                <PlusSquare size={17} />
              </Link>
            )}
          </div>
        </div>

        <div className="md:hidden pb-3 space-y-2">
          <form onSubmit={handleSearch}>
            <div
              ref={mobileSearchRef}
              className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white/75 px-3 py-2 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow"
            >
              <Search size={17} className="text-slate-500" />
              <input
                name="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search products"
                className="w-full bg-transparent outline-none text-sm font-semibold"
              />
              {showSuggestions && suggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-xl border border-slate-200 bg-white shadow-lg">
                  {suggestions.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSuggestionClick(product)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-slate-900">{product.title}</span>
                        <span className="text-xs font-semibold text-slate-600">{product.category}</span>
                      </span>
                      <span className="shrink-0 text-xs font-black text-slate-800">
                        {formatCurrency(product.price)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            <Link to="/" className={mobileLinkClass}>Home</Link>
            {!vendorMode ? <Link to="/products" className={mobileLinkClass}>Shop</Link> : null}
            {!vendorMode ? <Link to="/products?sort=newest" className={mobileLinkClass}>New</Link> : null}
            {vendorMode ? <Link to="/vendor/dashboard" className={mobileLinkClass}>Dashboard</Link> : null}
            {vendorMode ? <Link to="/vendor/add-product" className={mobileLinkClass}>Add Product</Link> : null}
            {!user ? <Link to="/login" className={mobileLinkClass}>Login</Link> : null}
            {user ? (
              <button type="button" onClick={logout} className={mobileActionBtnClass}>
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
