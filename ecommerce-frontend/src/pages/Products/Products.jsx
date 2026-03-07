import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ProductGrid from "../../components/product/ProductGrid";
import { listProducts, listCategories } from "../../services/api/products.api";

export default function Products() {
  const [params, setParams] = useSearchParams();

  const q = params.get("q") || "";
  const category = params.get("category") || "All";
  const sort = params.get("sort") || "relevance";

  const perPage = 12;

  const rawPage = Number(params.get("page") || "1");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const {
    data: categories = ["All"],
    isError: isCatError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["products", { q, category, sort }],
    queryFn: () => listProducts({ q, category, sort }),
    retry: 1, // real-world: don't spam retries
  });

  const totalPages = Math.max(1, Math.ceil(data.length / perPage));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return data.slice(start, start + perPage);
  }, [data, safePage]);

  const startItem = data.length ? (safePage - 1) * perPage + 1 : 0;
  const endItem = Math.min(safePage * perPage, data.length);

  function setParam(key, value) {
    const next = new URLSearchParams(params);

    // reset page when filters change
    if (key === "q" || key === "category" || key === "sort") next.delete("page");

    if (!value || value === "relevance" || value === "All") next.delete(key);
    else next.set(key, value);

    setParams(next);
  }

  function clearFilters() {
    const next = new URLSearchParams(params);
    next.delete("category");
    next.delete("sort");
    next.delete("q");
    next.delete("page");
    setParams(next);
  }

  function goToPage(nextPage) {
    const p = Math.max(1, Math.min(totalPages, nextPage));
    const next = new URLSearchParams(params);

    if (p === 1) next.delete("page");
    else next.set("page", String(p));

    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getPageWindow() {
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, safePage - half);
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    const pages = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }

  const windowPages = getPageWindow();
  const showLeftDots = windowPages[0] > 2;
  const showRightDots = windowPages[windowPages.length - 1] < totalPages - 1;

  const errorMessage = String(error?.message || "Something went wrong. Please try again.");

  return (
    <div className="ec-container">
      <div className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="ec-pill inline-flex">Catalog</div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">All Products</h1>
            <p className="mt-1 text-slate-700">
              Browse our latest collection. Filter by category and sort by price or rating.
            </p>
          </div>

          <div className="text-sm font-extrabold text-slate-700">
            {isLoading ? "Loading…" : `${data.length} items`}
          </div>
        </div>

        {/* Error Banner (Real-world behavior) */}
        {isError ? (
          <div className="mt-6 ec-surface p-5 border border-rose-300/70">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-black text-slate-950">We couldn’t load products</div>
                <div className="mt-1 text-sm text-slate-700">
                  {errorMessage}
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  Tip: If backend isn’t running yet, set/clear <span className="font-black">VITE_API_BASE_URL</span> in <span className="font-black">.env</span>.
                </div>
              </div>

              <button
                onClick={() => refetch()}
                className="ec-btn-primary"
                disabled={isFetching}
              >
                {isFetching ? "Retrying…" : "Retry"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Filter Bar */}
        <div className="mt-6 ec-surface p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-black text-slate-700">Category</label>
              <select
                value={category}
                onChange={(e) => setParam("category", e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                disabled={isCatError}
              >
                {(categories?.length ? categories : ["All"]).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {isCatError ? (
                <div className="mt-1 text-xs font-black text-rose-700">
                  Categories failed to load (using fallback).
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-black text-slate-700">Sort by</label>
              <select
                value={sort}
                onChange={(e) => setParam("sort", e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="relevance">Recommended</option>
                <option value="newest">New Arrivals</option>
                <option value="rating-desc">Top Rated</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            <div className="flex items-end">
              <button onClick={clearFilters} className="w-full ec-btn-ghost">
                Reset Filters
              </button>
            </div>
          </div>

          {q ? (
            <div className="mt-3 text-xs text-slate-700">
              Results for: <span className="font-black text-slate-950">“{q}”</span>
            </div>
          ) : null}
        </div>

        {/* Grid */}
        <div className="mt-6">
          <ProductGrid items={pageItems} loading={isLoading} skeletonCount={12} />

          {/* Empty state */}
          {!isLoading && !isError && data.length === 0 ? (
            <div className="mt-6 ec-surface p-8 text-slate-800 font-extrabold">
              No products found.
            </div>
          ) : null}

          {/* Pagination */}
          {!isLoading && !isError && data.length > 0 ? (
            <div className="mt-8 ec-surface p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm font-extrabold text-slate-700">
                Showing <span className="text-slate-950">{startItem}–{endItem}</span> of{" "}
                <span className="text-slate-950">{data.length}</span> items
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className={
                    "rounded-2xl px-4 py-2 text-sm font-black border transition " +
                    (safePage <= 1
                      ? "border-slate-300/70 bg-slate-900/5 text-slate-500 cursor-not-allowed"
                      : "border-slate-300/70 bg-slate-900/5 text-slate-900 hover:bg-slate-900/10")
                  }
                >
                  Prev
                </button>

                <PageBtn active={safePage === 1} onClick={() => goToPage(1)}>
                  1
                </PageBtn>

                {showLeftDots ? (
                  <span className="px-2 text-slate-600 font-black">…</span>
                ) : null}

                {windowPages
                  .filter((p) => p !== 1 && p !== totalPages)
                  .map((p) => (
                    <PageBtn key={p} active={safePage === p} onClick={() => goToPage(p)}>
                      {p}
                    </PageBtn>
                  ))}

                {showRightDots ? (
                  <span className="px-2 text-slate-600 font-black">…</span>
                ) : null}

                {totalPages > 1 ? (
                  <PageBtn active={safePage === totalPages} onClick={() => goToPage(totalPages)}>
                    {totalPages}
                  </PageBtn>
                ) : null}

                <button
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className={
                    "rounded-2xl px-4 py-2 text-sm font-black border transition " +
                    (safePage >= totalPages
                      ? "border-slate-300/70 bg-slate-900/5 text-slate-500 cursor-not-allowed"
                      : "border-slate-300/70 bg-slate-900/5 text-slate-900 hover:bg-slate-900/10")
                  }
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PageBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "h-10 min-w-10 px-3 rounded-2xl text-sm font-black border transition " +
        (active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-300/70 bg-slate-900/5 text-slate-900 hover:bg-slate-900/10")
      }
    >
      {children}
    </button>
  );
}
