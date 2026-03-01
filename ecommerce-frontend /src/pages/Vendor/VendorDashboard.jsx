import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CircleDollarSign,
  PackageCheck,
  Plus,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import useAuthStore from "../../store/auth.store";
import useProductsStore from "../../store/products.store";
import { formatCurrency } from "../../utils/formatCurrency";

export default function VendorDashboard() {
  const user = useAuthStore((s) => s.user);
  const getAllProducts = useProductsStore((s) => s.getAllProducts);
  const getVendorStats = useProductsStore((s) => s.getVendorStats);

  const stats = user?.id
    ? getVendorStats(user.id)
    : { totalProducts: 0, totalSold: 0, totalStock: 0 };

  const vendorProducts = user?.id
    ? getAllProducts().filter((p) => String(p.vendorId) === String(user.id))
    : [];

  const latestProducts = [...vendorProducts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  const topProducts = [...vendorProducts]
    .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0))
    .slice(0, 4);

  const totalRevenue = vendorProducts.reduce(
    (sum, product) => sum + Number(product.price || 0) * Number(product.sold || 0),
    0
  );

  const outOfStock = vendorProducts.filter((p) => Number(p.stock || 0) === 0).length;
  const lowStock = vendorProducts.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5).length;
  const activeListings = vendorProducts.filter((p) => (p.status || "active") === "active").length;
  const draftListings = vendorProducts.filter((p) => (p.status || "active") === "draft").length;

  const sellThrough = stats.totalSold + stats.totalStock > 0
    ? Math.round((stats.totalSold / (stats.totalSold + stats.totalStock)) * 100)
    : 0;

  return (
    <div className="ec-container">
      <div className="py-8 space-y-6">
        <section className="ec-surface p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="ec-pill inline-flex">Seller Console</div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
                Vendor Dashboard
              </h1>
              <p className="mt-1 text-slate-700">
                Welcome back, {user?.organizationName || user?.name || "Vendor"}. Here is your business performance snapshot.
              </p>
            </div>

            <Link to="/vendor/add-product" className="ec-btn-primary inline-flex items-center gap-2 w-fit">
              <Plus size={16} />
              Add Product
            </Link>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total products" value={stats.totalProducts} icon={<Boxes size={16} className="text-blue-700" />} />
          <StatCard label="Units sold" value={stats.totalSold} icon={<PackageCheck size={16} className="text-emerald-700" />} />
          <StatCard label="Stock left" value={stats.totalStock} icon={<Warehouse size={16} className="text-violet-700" />} />
          <StatCard label="Total revenue" value={formatCurrency(totalRevenue)} icon={<CircleDollarSign size={16} className="text-amber-700" />} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="ec-surface p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Inventory Health</h2>
                <p className="mt-1 text-sm text-slate-700">Monitor sell-through and listing status.</p>
              </div>
              <div className="text-sm font-black text-slate-900">Sell-through: {sellThrough}%</div>
            </div>

            <div className="mt-4 space-y-3">
              <MetricRow label="Active listings" value={activeListings} total={Math.max(vendorProducts.length, 1)} color="bg-emerald-500" />
              <MetricRow label="Draft listings" value={draftListings} total={Math.max(vendorProducts.length, 1)} color="bg-amber-500" />
              <MetricRow label="Low stock" value={lowStock} total={Math.max(vendorProducts.length, 1)} color="bg-orange-500" />
              <MetricRow label="Out of stock" value={outOfStock} total={Math.max(vendorProducts.length, 1)} color="bg-rose-500" />
            </div>
          </section>

          <section className="ec-surface p-5">
            <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
              <TrendingUp size={16} className="text-blue-700" />
              Top Performers
            </div>

            {topProducts.length === 0 ? (
              <div className="mt-3 text-sm font-semibold text-slate-700">No sales data yet.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {topProducts.map((product) => (
                  <div key={product.id} className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
                    <div className="line-clamp-1 text-sm font-black text-slate-950">{product.title}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-700">
                      Sold: {Number(product.sold || 0)} • Revenue: {formatCurrency(Number(product.sold || 0) * Number(product.price || 0))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="ec-surface p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">Catalog Snapshot</h2>
              <p className="mt-1 text-sm text-slate-700">Latest products with pricing, stock, and sales metrics.</p>
            </div>
            {outOfStock > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                <AlertTriangle size={14} />
                {outOfStock} out of stock
              </div>
            ) : null}
          </div>

          {vendorProducts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-300/70 bg-slate-900/5 px-4 py-6 text-sm font-extrabold text-slate-700">
              No products added yet. Add your first product to activate seller analytics.
            </div>
          ) : (
            <>
              <div className="mt-5 hidden lg:block overflow-x-auto rounded-2xl border border-slate-200 bg-white/70">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Price</th>
                      <th className="px-4 py-3 text-left">Stock</th>
                      <th className="px-4 py-3 text-left">Sold</th>
                      <th className="px-4 py-3 text-left">Revenue</th>
                      <th className="px-4 py-3 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestProducts.map((product) => (
                      <tr key={product.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="font-black text-slate-950 line-clamp-1">{product.title}</div>
                          <div className="text-xs text-slate-600 line-clamp-1">
                            {product.description || "No description provided."}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge stock={product.stock} status={product.status} />
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(product.price)}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{Number(product.stock || 0)}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{Number(product.sold || 0)}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {formatCurrency(Number(product.price || 0) * Number(product.sold || 0))}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{formatCreatedAt(product.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid gap-3 lg:hidden">
                {latestProducts.map((product) => (
                  <article
                    key={product.id}
                    className="rounded-2xl border border-slate-300/70 bg-slate-900/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-black text-slate-950">{product.title}</div>
                      <StatusBadge stock={product.stock} status={product.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-700 line-clamp-2">
                      {product.description || "No description provided."}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                      <MetaItem label="Price" value={formatCurrency(Number(product.price || 0))} />
                      <MetaItem label="Stock" value={Number(product.stock || 0)} />
                      <MetaItem label="Sold" value={Number(product.sold || 0)} />
                      <MetaItem label="Created" value={formatCreatedAt(product.createdAt)} />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="ec-surface p-5">
      <div className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-700">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

function MetricRow({ label, value, total, color }) {
  const pct = Math.min(100, Math.max(0, Math.round((Number(value || 0) / Number(total || 1)) * 100)));

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-black text-slate-800">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-1.5 h-2.5 rounded-full bg-slate-200/70 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ stock, status }) {
  if ((status || "active") === "draft") {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-700">Draft</span>;
  }

  if (Number(stock || 0) === 0) {
    return <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-700">Out of stock</span>;
  }

  if (Number(stock || 0) <= 5) {
    return <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-black text-orange-700">Low stock</span>;
  }

  return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">Active</span>;
}

function MetaItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-300/70 bg-white/70 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className="mt-0.5 font-black text-slate-950">{value}</div>
    </div>
  );
}

function formatCreatedAt(createdAt) {
  if (!createdAt) return "N/A";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}
