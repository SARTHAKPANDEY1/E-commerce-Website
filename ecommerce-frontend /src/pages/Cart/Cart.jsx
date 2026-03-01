import { Link } from "react-router-dom";
import useCartStore from "../../store/cart.store";
import { formatCurrency } from "../../utils/formatCurrency";
import EmptyState from "../../components/common/EmptyState";

export default function Cart() {
  const { items, setQty, removeItem, clear } = useCartStore();

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = items.length ? 99 : 0;
  const total = subtotal + shipping;

  return (
    <div className="ec-container">
      <div className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              Your Cart
            </h1>
            <p className="mt-1 text-slate-700">
              Review items and proceed to checkout.
            </p>
          </div>

          {items.length ? (
            <button
              onClick={clear}
              className="text-sm font-black text-slate-800 hover:text-slate-950"
            >
              Remove all
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          {items.length === 0 ? (
            <EmptyState
              title="Your cart is empty"
              subtitle="Looks like you haven’t added anything yet. Start exploring products."
              actionHref="/products"
              actionText="Continue Shopping"
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((i) => (
                  <div key={i.id} className="ec-surface p-4 flex flex-col sm:flex-row gap-4">
                    <img
                      src={i.image}
                      alt={i.title}
                      className="h-20 w-20 rounded-2xl object-cover bg-slate-900/5"
                    />

                    <div className="flex-1">
                      <div className="font-black text-slate-950">{i.title}</div>
                      <div className="text-sm text-slate-700 mt-1">
                        {formatCurrency(i.price)} • Inclusive of taxes
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-700">Qty</span>
                          <input
                            type="number"
                            min="1"
                            value={i.qty}
                            onChange={(e) => setQty(i.id, e.target.value)}
                            className="w-24 rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </div>

                        <button
                          onClick={() => removeItem(i.id)}
                          className="text-sm font-black text-rose-700 hover:text-rose-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="font-black text-slate-950 sm:self-start">
                      {formatCurrency(i.price * i.qty)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <aside className="ec-surface p-6 h-fit">
                <div className="text-lg font-black text-slate-950">Order Summary</div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-800">
                    <span>Subtotal</span>
                    <span className="font-black text-slate-950">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-800">
                    <span>Shipping</span>
                    <span className="font-black text-slate-950">{formatCurrency(shipping)}</span>
                  </div>
                  <div className="border-t border-slate-300/70 pt-3 flex justify-between">
                    <span className="font-black text-slate-950">Total</span>
                    <span className="font-black text-slate-950">{formatCurrency(total)}</span>
                  </div>
                </div>

                <Link to="/checkout" className="mt-5 block text-center ec-btn-primary">
                  Proceed to Checkout
                </Link>

                <Link
                  to="/products"
                  className="mt-3 block text-center ec-btn-ghost"
                >
                  Continue Shopping
                </Link>

                <p className="mt-3 text-xs text-slate-700">
                  Shipping and payment are demo values for now.
                </p>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
