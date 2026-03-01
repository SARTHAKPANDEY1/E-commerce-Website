import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Building2, ShieldCheck, Store, Truck } from "lucide-react";
import useAuthStore from "../../store/auth.store";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [selectedRole, setSelectedRole] = useState("customer");

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: "", password: "", organizationName: "" },
  });

  function onSubmit(values) {
    const vendorOrg = String(values.organizationName || "").trim();

    login(
      {
        id: values.email,
        name: selectedRole === "vendor" ? vendorOrg : "Customer User",
        email: values.email,
        organizationName: selectedRole === "vendor" ? vendorOrg : null,
      },
      selectedRole
    );
    navigate(selectedRole === "vendor" ? "/vendor/dashboard" : "/products");
  }

  return (
    <div className="ec-container">
      <div className="py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit(onSubmit)} className="ec-surface p-6">
            <div className="ec-pill inline-flex">
              {selectedRole === "vendor" ? "Vendor Sign In" : "Customer Sign In"}
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-950">Welcome back</h1>
            <p className="mt-1 text-slate-700">
              {selectedRole === "vendor"
                ? "Access your seller dashboard, inventory, and order insights."
                : "Login to track orders and checkout faster."}
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-800">Login As</label>
                <div className="mt-2 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white/70 p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("customer")}
                    className={
                      "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition " +
                      (selectedRole === "customer"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-100/70")
                    }
                  >
                    <Store size={16} />
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("vendor")}
                    className={
                      "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition " +
                      (selectedRole === "vendor"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-100/70")
                    }
                  >
                    <Building2 size={16} />
                    Vendor
                  </button>
                </div>
              </div>

              <Field
                label={selectedRole === "vendor" ? "Business Email" : "Email"}
                error={errors.email?.message}
              >
                <input
                  {...register("email", { required: "Email is required" })}
                  placeholder={
                    selectedRole === "vendor" ? "seller@brand.com" : "you@example.com"
                  }
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>

              <Field label="Password" error={errors.password?.message}>
                <input
                  type="password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "Min 6 characters" },
                  })}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>

              {selectedRole === "vendor" ? (
                <Field label="Organization Name" error={errors.organizationName?.message}>
                  <input
                    {...register("organizationName", {
                      validate: (value) =>
                        selectedRole !== "vendor" ||
                        String(value || "").trim().length > 1 ||
                        "Organization name is required for vendor login",
                    })}
                    placeholder="Enter your organization name"
                    className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                  />
                </Field>
              ) : null}

              <button className="w-full ec-btn-primary">
                {selectedRole === "vendor" ? "Login to Vendor Panel" : "Login"}
              </button>

              <p className="text-xs text-slate-700">
                New here?{" "}
                <Link className="font-black underline text-slate-950" to="/register">
                  Create an account
                </Link>
              </p>
            </div>
          </form>

          <div className="ec-surface p-8">
            {selectedRole === "vendor" ? (
              <>
                <div className="text-2xl font-black text-slate-950">Vendor Workspace</div>
                <p className="mt-2 text-slate-700">
                  Manage products, track units sold, and monitor stock levels in one place.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <InfoCard
                    icon={<Building2 size={18} className="text-blue-700" />}
                    title="Organization access"
                    text="Sign in with your registered business identity."
                  />
                  <InfoCard
                    icon={<Truck size={18} className="text-indigo-700" />}
                    title="Inventory control"
                    text="Update stock and monitor sales from dashboard."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-black text-slate-950">New customer?</div>
                <p className="mt-2 text-slate-700">
                  Create an account to save your details and checkout faster.
                </p>
                <Link to="/register" className="inline-flex mt-6 ec-btn-primary">
                  Create account
                </Link>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <InfoCard
                    icon={<ShieldCheck size={18} className="text-emerald-700" />}
                    title="Secure checkout"
                    text="Demo UI now, payments later"
                  />
                  <InfoCard
                    icon={<Truck size={18} className="text-blue-700" />}
                    title="Order tracking"
                    text="Coming with Django backend"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <div className="ec-surface-soft p-4">
      <div className="inline-flex items-center gap-2 font-black text-slate-950">
        {icon}
        {title}
      </div>
      <div className="mt-1 text-sm text-slate-700">{text}</div>
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
