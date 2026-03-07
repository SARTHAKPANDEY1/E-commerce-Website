import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import SettingsPanel from "../../components/common/SettingsPanel";
import { t, useAppSettings } from "../../hooks/useAppSettings";
import {
  getVendorOrdersSummary,
  listVendorOrders,
  listVendorProducts,
  updateVendorOrderItemStatus,
} from "../../services/api/vendor.api";
import { formatCurrency } from "../../utils/formatCurrency";

export default function VendorDashboard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const getAllProducts = useProductsStore((s) => s.getAllProducts);
  const getVendorStats = useProductsStore((s) => s.getVendorStats);
  const [tab, setTab] = useState("overview");
  const [orderActionError, setOrderActionError] = useState("");
  const [orderFilter, setOrderFilter] = useState("pending");
  const { settings } = useAppSettings();
  const lang = settings.language;

  useEffect(() => {
    if (settings.preferredOption === "orders") {
      setTab("orders");
    } else if (settings.preferredOption === "analytics") {
      setTab("overview");
    }
  }, [settings.preferredOption]);

  const {
    data: apiVendorProducts = [],
    isLoading: isProductsLoading,
  } = useQuery({
    queryKey: ["vendor-products"],
    queryFn: listVendorProducts,
  });

  const {
    data: vendorOrders = [],
    isLoading: isOrdersLoading,
  } = useQuery({
    queryKey: ["vendor-orders", orderFilter],
    queryFn: () => listVendorOrders({ vendorStatus: orderFilter === "all" ? "" : orderFilter }),
    enabled: tab === "orders",
  });
  const { data: allVendorOrders = [] } = useQuery({
    queryKey: ["vendor-orders-all"],
    queryFn: () => listVendorOrders({}),
  });

  const { data: orderSummary = {} } = useQuery({
    queryKey: ["vendor-order-summary"],
    queryFn: getVendorOrdersSummary,
  });

  const orderActionMutation = useMutation({
    mutationFn: ({ itemId, payload }) => updateVendorOrderItemStatus(itemId, payload),
    onSuccess: () => {
      setOrderActionError("");
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-order-summary"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
    },
    onError: (error) => {
      setOrderActionError(error?.message || "Could not update order status.");
    },
  });

  const fallbackStats = user?.id
    ? getVendorStats(user.id)
    : { totalProducts: 0, totalSold: 0, totalStock: 0 };
  const fallbackProducts = user?.id
    ? getAllProducts().filter((p) => String(p.vendorId) === String(user.id))
    : [];
  const vendorProducts = apiVendorProducts.length ? apiVendorProducts : fallbackProducts;
  const stats = apiVendorProducts.length
    ? {
        totalProducts: vendorProducts.length,
        totalSold:
          allVendorOrders.length > 0
            ? allVendorOrders
                .filter((item) => ["accepted", "shipped"].includes(String(item.vendorStatus || "")))
                .reduce((sum, item) => sum + Number(item.quantity || 0), 0)
            : vendorProducts.reduce((sum, p) => sum + Number(p.sold || 0), 0),
        totalStock: vendorProducts.reduce((sum, p) => sum + Number(p.stock || 0), 0),
      }
    : fallbackStats;

  const latestProducts = [...vendorProducts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  const topProducts = [...vendorProducts]
    .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0))
    .slice(0, 4);

  const totalRevenue =
    allVendorOrders.length > 0
      ? allVendorOrders
          .filter((item) => ["accepted", "shipped"].includes(String(item.vendorStatus || "")))
          .reduce((sum, item) => sum + Number(item.line_total || 0), 0)
      : vendorProducts.reduce(
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

  function handleOrderStatus(item, nextStatus) {
    let payload = { status: nextStatus };
    if (nextStatus === "rejected") {
      const reason = window.prompt("Please enter reason for rejection:");
      if (reason === null) return;
      if (!String(reason).trim()) {
        setOrderActionError("Rejection reason is required.");
        return;
      }
      payload = { status: nextStatus, reason: String(reason).trim() };
    }
    orderActionMutation.mutate({ itemId: item.id, payload });
  }

  const orderStatusBadges = useMemo(
    () => ({
      pending: "bg-amber-100 text-amber-700",
      accepted: "bg-blue-100 text-blue-700",
      rejected: "bg-rose-100 text-rose-700",
      shipped: "bg-emerald-100 text-emerald-700",
    }),
    []
  );

  return (
    <div className="ec-container">
      <div className="py-8 space-y-6">
        <section className="ec-surface p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="ec-pill inline-flex">Seller Console</div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
                {t(lang, "Vendor Dashboard", "वेंडर डैशबोर्ड")}
              </h1>
              <p className="mt-1 text-slate-700">
                {t(lang, "Welcome back,", "वापसी पर स्वागत है,")} {user?.organizationName || user?.name || t(lang, "Vendor", "वेंडर")}. {t(lang, "Here is your business performance snapshot.", "यहाँ आपके व्यवसाय का परफॉर्मेंस स्नैपशॉट है।")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <SettingsPanel />
              <button
                type="button"
                onClick={() => setTab("overview")}
                className={
                  "rounded-xl px-3 py-2 text-xs font-black border " +
                  (tab === "overview"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800")
                }
              >
                {t(lang, "Overview", "ओवरव्यू")}
              </button>
              <button
                type="button"
                onClick={() => setTab("orders")}
                className={
                  "rounded-xl px-3 py-2 text-xs font-black border inline-flex items-center gap-1.5 " +
                  (tab === "orders"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800")
                }
              >
                {t(lang, "Orders", "ऑर्डर्स")}
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-900">
                  {orderSummary.pendingItems ?? 0}
                </span>
              </button>
              <Link to="/vendor/add-product" className="ec-btn-primary inline-flex items-center gap-2 w-fit">
                <Plus size={16} />
                {t(lang, "Add Product", "प्रोडक्ट जोड़ें")}
              </Link>
            </div>
          </div>
        </section>

        {tab === "overview" ? (
        <>
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
              {isProductsLoading
                ? "Loading vendor products..."
                : "No products added yet. Add your first product to activate seller analytics."}
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
        </>
        ) : (
          <section className="ec-surface p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">Vendor Orders</h2>
                <p className="mt-1 text-sm text-slate-700">View customer details and accept/reject/ship line items.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "pending", "accepted", "rejected", "shipped"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setOrderFilter(status)}
                    className={
                      "rounded-lg px-3 py-1.5 text-xs font-black border " +
                      (orderFilter === status
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-800")
                    }
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {orderActionError ? (
              <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-black text-rose-700">
                {orderActionError}
              </div>
            ) : null}

            {isOrdersLoading ? (
              <div className="mt-5 text-sm font-semibold text-slate-700">Loading vendor orders...</div>
            ) : vendorOrders.length === 0 ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                No orders found for this filter.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {vendorOrders.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-950">
                          Order #{item.orderId} • Item #{item.id}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-700">
                          {item.productName} x {item.quantity} • {formatCurrency(Number(item.line_total || 0))}
                        </div>
                        <div className="mt-1 text-xs text-slate-700">
                          Customer: {item.customerName} ({item.customerEmail})
                        </div>
                        <div className="mt-1 text-xs text-slate-700">
                          Shipping: {item.shippingFullName}, {item.shippingPhone}, {item.shippingAddress}, {item.shippingCity}, {item.shippingState} - {item.shippingPincode}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${orderStatusBadges[item.vendorStatus] || "bg-slate-100 text-slate-700"}`}>
                          {item.vendorStatus}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.vendorStatus === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOrderStatus(item, "accepted")}
                            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                            disabled={orderActionMutation.isPending}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOrderStatus(item, "rejected")}
                            className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                            disabled={orderActionMutation.isPending}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}

                      {item.vendorStatus === "accepted" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOrderStatus(item, "shipped")}
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                            disabled={orderActionMutation.isPending}
                          >
                            Mark Shipped
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOrderStatus(item, "rejected")}
                            className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                            disabled={orderActionMutation.isPending}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
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
