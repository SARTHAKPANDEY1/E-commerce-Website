import ProductCard from "./ProductCard";

export default function ProductGrid({ items = [], loading = false, skeletonCount = 12 }) {
  if (loading) {
    return (
      <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <div key={idx} className="ec-surface overflow-hidden">
            <div className="aspect-[4/3] bg-slate-900/10 animate-pulse" />
            <div className="p-5">
              <div className="h-4 w-2/3 bg-slate-900/10 rounded-lg animate-pulse" />
              <div className="mt-3 h-4 w-1/2 bg-slate-900/10 rounded-lg animate-pulse" />
              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="h-6 w-20 bg-slate-900/10 rounded-xl animate-pulse" />
                <div className="h-10 w-24 bg-slate-900/10 rounded-2xl animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
