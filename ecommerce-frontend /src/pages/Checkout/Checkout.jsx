import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import useCartStore from "../../store/cart.store";
import useProductsStore from "../../store/products.store";
import { formatCurrency } from "../../utils/formatCurrency";
import EmptyState from "../../components/common/EmptyState";

export default function Checkout() {
  const queryClient = useQueryClient();
  const { items, clear } = useCartStore();
  const applyCheckout = useProductsStore((s) => s.applyCheckout);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);
  const shipping = items.length ? 99 : 0;
  const total = subtotal + shipping;

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { fullName: "", phone: "", email: "", address: "", city: "", state: "", pincode: "" },
  });

  function onSubmit(values) {
    console.log("Checkout:", values);
    applyCheckout(items);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product"] });
    alert("Order placed (mock). Later connect Django API here.");
    clear();
  }

  if (items.length === 0) {
    return (
      <div className="ec-container">
        <div className="py-8">
          <EmptyState
            title="Your cart is empty"
            subtitle="Add products before checkout."
            actionHref="/products"
            actionText="Browse Products"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="ec-container">
      <div className="py-8">
        <div>
          <div className="ec-pill inline-flex">Secure Step</div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
            Checkout
          </h1>
          <p className="mt-1 text-slate-700">
            Enter delivery details to place your order.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="order-2 lg:order-1 lg:col-span-2 ec-surface p-5 sm:p-6">
            <div className="text-lg font-black text-slate-950">Delivery Information</div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full Name" error={errors.fullName?.message}>
                <input
                  {...register("fullName", { required: "Full name is required" })}
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>

              <Field label="Phone" error={errors.phone?.message}>
                <input
                  {...register("phone", {
                    required: "Phone is required",
                    pattern: { value: /^[0-9]{10}$/, message: "Enter 10 digit phone" },
                  })}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>

              <Field label="Email" error={errors.email?.message}>
                <input
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter valid email" },
                  })}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>

              <Field label="Pincode" error={errors.pincode?.message}>
                <input
                  {...register("pincode", {
                    required: "Pincode is required",
                    pattern: { value: /^[0-9]{6}$/, message: "Enter 6 digit pincode" },
                  })}
                  placeholder="6-digit pincode"
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Address" error={errors.address?.message}>
                  <textarea
                    rows={3}
                    {...register("address", { required: "Address is required" })}
                    placeholder="House no., street, landmark"
                    className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                  />
                </Field>
              </div>

              <Field label="City" error={errors.city?.message}>
                <input
                  {...register("city", { required: "City is required" })}
                  placeholder="City"
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>

              <Field label="State" error={errors.state?.message}>
                <input
                  {...register("state", { required: "State is required" })}
                  placeholder="State"
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>
            </div>

            <button type="submit" className="mt-6 ec-btn-primary">
              Place Order
            </button>

            <p className="mt-3 text-xs text-slate-700">
              By placing your order, you agree to our Terms & Privacy Policy.
            </p>
          </form>

          {/* Summary */}
          <aside className="order-1 lg:order-2 ec-surface p-5 sm:p-6 h-fit">
            <div className="text-lg font-black text-slate-950">Order Summary</div>

            <div className="mt-4 space-y-3">
              {items.map((i) => (
                <div key={i.id} className="flex gap-3">
                  <img
                    src={i.image}
                    alt={i.title}
                    className="h-12 w-12 rounded-2xl object-cover bg-slate-900/5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-black text-slate-950 leading-snug">
                      {i.title}
                    </div>
                    <div className="text-xs text-slate-700 mt-0.5">Qty: {i.qty}</div>
                  </div>
                  <div className="text-sm font-black text-slate-950">
                    {formatCurrency(i.price * i.qty)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-300/70 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-800">
                <span>Subtotal</span>
                <span className="font-black text-slate-950">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-800">
                <span>Shipping</span>
                <span className="font-black text-slate-950">{formatCurrency(shipping)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-950">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs font-black text-slate-800">{label}</label>
      <div className="mt-2">{children}</div>
      {error ? <div className="mt-1 text-xs font-black text-rose-700">{error}</div> : null}
    </div>
  );
}
