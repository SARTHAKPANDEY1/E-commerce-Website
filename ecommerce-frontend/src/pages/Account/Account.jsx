import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import useAuthStore from "../../store/auth.store";
import useCartStore from "../../store/cart.store";
import { listProducts } from "../../services/api/products.api";
import { cancelMyOrder, getMyOrderDetail, listMyOrders } from "../../services/api/orders.api";
import { formatCurrency } from "../../utils/formatCurrency";
import { useState } from "react";
import SettingsPanel from "../../components/common/SettingsPanel";
import { t, useAppSettings } from "../../hooks/useAppSettings";

export default function Account() {
  const queryClient = useQueryClient();
  const { user, wishlist, toggleWishlist } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderActionError, setOrderActionError] = useState("");
  const { settings } = useAppSettings();
  const lang = settings.language;

  // Fetch products once, then filter wishlist items
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", { q: "", category: "All", sort: "relevance" }],
    queryFn: () => listProducts({ q: "", category: "All", sort: "relevance" }),
  });
  const {
    data: myOrders = [],
    isLoading: isLoadingOrders,
  } = useQuery({
    queryKey: ["my-orders"],
    queryFn: listMyOrders,
    enabled: Boolean(user),
  });
  const {
    data: selectedOrder,
    isLoading: isLoadingSelectedOrder,
  } = useQuery({
    queryKey: ["my-order-detail", selectedOrderId],
    queryFn: () => getMyOrderDetail(selectedOrderId),
    enabled: Boolean(user && selectedOrderId),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: ({ orderId, reason }) => cancelMyOrder(orderId, reason),
    onSuccess: (updatedOrder) => {
      setSelectedOrderId(updatedOrder.id);
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-order-detail", updatedOrder.id] });
      setOrderActionError("");
    },
    onError: (error) => {
      setOrderActionError(error.message || "Could not cancel order.");
    },
  });

  function handleCancelOrder(orderId) {
    const reason = window.prompt("Please enter the reason for cancellation:");
    if (reason === null) return;
    if (!String(reason).trim()) {
      setOrderActionError("Cancellation reason is required.");
      return;
    }
    cancelOrderMutation.mutate({ orderId, reason: String(reason).trim() });
  }

  function getProductImageById(productId) {
    const product = (products || []).find((p) => String(p.id) === String(productId));
    return product?.image || "";
  }

  function resolveOrderItemImage(item) {
    return item?.productImage || getProductImageById(item?.productId) || "https://picsum.photos/seed/order-item/64/64";
  }

  function toggleOrderDetails(orderId) {
    setOrderActionError("");
    setSelectedOrderId((prev) => (prev === orderId ? null : orderId));
  }

  const wishlistedProducts = products.filter((p) => (wishlist || []).includes(p.id));

  return (
    <div className="ec-container">
      <div className="py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              {t(lang, "My Account", "मेरा अकाउंट")}
            </h1>
            <p className="mt-1 text-slate-700">
              {t(lang, "Manage your profile, wishlist and order history (backend later).", "अपनी प्रोफ़ाइल, विशलिस्ट और ऑर्डर इतिहास प्रबंधित करें।")}
            </p>
          </div>
          <SettingsPanel />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Profile */}
          <section className="ec-surface p-6 h-fit">
            {user ? (
              <>
                <div className="text-lg font-black text-slate-950">{user.name}</div>
                <div className="text-slate-700 mt-1">{user.email}</div>

                <div className="mt-6 ec-surface-soft p-5">
                  <div className="font-black text-slate-950">Orders</div>
                  {isLoadingOrders ? (
                    <div className="text-sm text-slate-700 mt-1">Loading your orders...</div>
                  ) : myOrders.length === 0 ? (
                    <>
                      <div className="text-sm text-slate-700 mt-1">
                        {t(lang, "No orders yet. When you place an order, it will appear here.", "अभी कोई ऑर्डर नहीं है। ऑर्डर करने पर यहाँ दिखेगा।")}
                      </div>
                      <Link to="/products" className="inline-flex mt-4 ec-btn-primary">
                        Start Shopping
                      </Link>
                    </>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {myOrders.map((order) => (
                        <div key={order.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                          <div className="flex items-start gap-3">
                            <img
                              src={resolveOrderItemImage(order.items?.[0] || {})}
                              alt={order.items?.[0]?.productName || "Ordered item"}
                              className="h-10 w-10 rounded-full object-cover bg-slate-100 border border-slate-200"
                            />
                            <div className="flex-1">
                              <div className="text-xs font-black text-slate-700">
                                Order #{order.id} • {order.status}
                              </div>
                              <div className="text-sm font-black text-slate-950 mt-1">
                                Total: {formatCurrency(Number(order.total_amount || 0))}
                              </div>
                              <div className="text-xs font-semibold text-slate-700 mt-1">
                                Items: {(order.items || []).length}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleOrderDetails(order.id)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-900 hover:bg-slate-50"
                            >
                              {selectedOrderId === order.id ? "Hide Details" : "View Details"}
                            </button>
                            {order.status !== "cancelled" && order.status !== "delivered" ? (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(order.id)}
                                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                disabled={cancelOrderMutation.isPending}
                              >
                                Cancel Order
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {orderActionError ? (
                    <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
                      {orderActionError}
                    </div>
                  ) : null}

                  {selectedOrderId ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      {isLoadingSelectedOrder || !selectedOrder ? (
                        <div className="text-sm font-semibold text-slate-700">Loading order details...</div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-black text-slate-950">Order #{selectedOrder.id} Details</div>
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(null)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-black text-slate-900 hover:bg-slate-50"
                            >
                              Hide Details
                            </button>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-slate-700">
                            <div>
                              <span className="font-black text-slate-900">Status:</span> {selectedOrder.status}
                            </div>
                            <div>
                              <span className="font-black text-slate-900">Placed At:</span>{" "}
                              {selectedOrder.placed_at ? new Date(selectedOrder.placed_at).toLocaleString() : "-"}
                            </div>
                            <div>
                              <span className="font-black text-slate-900">Subtotal:</span>{" "}
                              {formatCurrency(Number(selectedOrder.subtotal_amount || 0))}
                            </div>
                            <div>
                              <span className="font-black text-slate-900">Shipping:</span>{" "}
                              {formatCurrency(Number(selectedOrder.shipping_amount || 0))}
                            </div>
                            <div>
                              <span className="font-black text-slate-900">Total:</span>{" "}
                              {formatCurrency(Number(selectedOrder.total_amount || 0))}
                            </div>
                          </div>

                          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs font-black text-slate-900">Customer Details</div>
                            <div className="mt-1 text-xs text-slate-700">
                              <span className="font-black">Name:</span> {selectedOrder.shippingFullName || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-700">
                              <span className="font-black">Email:</span> {selectedOrder.shippingEmail || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-700">
                              <span className="font-black">Phone:</span> {selectedOrder.shippingPhone || "-"}
                            </div>
                          </div>

                          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs font-black text-slate-900">Shipping Address</div>
                            <div className="mt-1 text-xs text-slate-700">{selectedOrder.shippingAddress || "-"}</div>
                            <div className="mt-1 text-xs text-slate-700">
                              {selectedOrder.shippingCity || "-"}, {selectedOrder.shippingState || "-"} - {selectedOrder.shippingPincode || "-"}
                            </div>
                          </div>

                          {selectedOrder.cancelReason ? (
                            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700">
                              Cancel reason: {selectedOrder.cancelReason}
                            </div>
                          ) : null}

                          <div className="mt-3 text-xs font-black text-slate-900">Ordered Items</div>
                          <div className="mt-2 space-y-2">
                            {(selectedOrder.items || []).map((item) => (
                              <div key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                                <img
                                  src={resolveOrderItemImage(item)}
                                  alt={item.productName}
                                  className="h-8 w-8 rounded-full object-cover border border-slate-200"
                                />
                                <div className="flex-1 text-xs font-semibold text-slate-800">
                                  {item.productName} x {item.quantity}
                                </div>
                                <div className="text-xs font-black text-slate-900">
                                  {formatCurrency(Number(item.line_total || 0))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
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
