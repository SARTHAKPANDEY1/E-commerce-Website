import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Building2, CheckCircle2, ShieldCheck, Store, Truck, Wallet } from "lucide-react";
import useAuthStore from "../../store/auth.store";
import { loginUser } from "../../services/api/auth.api";
import GoogleLoginBtn from "../../components/GoogleLoginBtn";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  import.meta.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [selectedRole, setSelectedRole] = useState("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: "", password: "", organizationName: "" },
  });

  async function onSubmit(values) {
    setBackendError("");
    setIsSubmitting(true);
    try {
      const response = await loginUser({
        email: String(values.email || "").trim().toLowerCase(),
        password: values.password,
        role: selectedRole,
      });
      const user = response.user;
      login(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationName: user.organizationName ?? null,
        },
        user.role
      );
      navigate(user.role === "vendor" ? "/vendor/dashboard" : "/products");
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleSuccess(data) {
    const email = String(data?.email || "").trim().toLowerCase();
    if (!email) {
      setBackendError("Google login succeeded but no email was returned.");
      return;
    }

    login(
      {
        id: email,
        name: email.split("@")[0],
        email,
        organizationName: null,
      },
      "customer"
    );

    navigate("/");
  }

  function handleGoogleError(error) {
    const message = error?.message || "Google login failed";
    if (message === "user_not_registered") {
      navigate("/register");
      return;
    }
    setBackendError(message);
  }

  return (
    <div className="ec-container">
      <div className="py-8">
        <div className="grid lg:grid-cols-[1.08fr_.92fr] gap-6 items-stretch">
          <section className="ec-surface p-6 sm:p-8 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,.12),transparent_48%),linear-gradient(180deg,rgba(248,250,252,.95),rgba(241,245,249,.95))]">
            <div className="ec-pill inline-flex">
              {selectedRole === "vendor" ? "Vendor Sign In" : "Customer Sign In"}
            </div>

            <h1 className="mt-4 text-3xl sm:text-4xl leading-tight font-black tracking-tight text-slate-950">
              {selectedRole === "vendor" ? "Manage your storefront" : "Welcome back to Onlineदुकान"}
            </h1>

            <p className="mt-3 text-slate-700 max-w-xl">
              {selectedRole === "vendor"
                ? "Track inventory, monitor sales, and update listings from one professional dashboard."
                : "Continue shopping with saved preferences, fast checkout, and order tracking in one place."}
            </p>

            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              <Highlight icon={<ShieldCheck size={16} className="text-emerald-700" />} label="Secure Access" />
              <Highlight icon={<Truck size={16} className="text-blue-700" />} label="Order Tracking" />
              <Highlight icon={<Wallet size={16} className="text-indigo-700" />} label="Easy Checkout" />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="text-sm font-black text-slate-900">Trusted by growing sellers and repeat customers</div>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Streamlined product, order, and account workflows
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Mobile-first experience for shopping and management
                </li>
              </ul>
            </div>
          </section>

          <form onSubmit={handleSubmit(onSubmit)} className="ec-surface p-6 sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">Sign In</h2>
            <p className="mt-1 text-sm text-slate-700">Use your registered credentials to continue.</p>

            <div className="mt-6 space-y-4">
              {GOOGLE_CLIENT_ID ? (
                <GoogleLoginBtn onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-2xl border border-slate-300/80 bg-white px-3 py-3 text-sm font-black text-slate-500"
                >
                  Continue with Google (configure VITE_GOOGLE_CLIENT_ID)
                </button>
              )}

              <div className="relative py-1">
                <div className="h-px bg-slate-200" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
                  or
                </span>
              </div>

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

              <Field label={selectedRole === "vendor" ? "Business Email" : "Email"} error={errors.email?.message}>
                <input
                  {...register("email", { required: "Email is required" })}
                  placeholder={selectedRole === "vendor" ? "seller@brand.com" : "you@example.com"}
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-3 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>

              <Field label="Password" error={errors.password?.message}>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password", {
                      required: "Password is required",
                      minLength: { value: 6, message: "Min 6 characters" },
                    })}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-3 pr-16 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-700 hover:text-slate-950"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
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
                    className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-3 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                  />
                </Field>
              ) : null}

              {backendError ? (
                <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-black text-rose-700">
                  {backendError}
                </div>
              ) : null}

              <button className="w-full ec-btn-primary py-3 disabled:opacity-60" disabled={isSubmitting}>
                {isSubmitting
                  ? "Please wait..."
                  : selectedRole === "vendor"
                    ? "Login to Vendor Panel"
                    : "Login"}
              </button>

              <p className="text-xs text-slate-700 text-center">
                New here?{" "}
                <Link className="font-black underline text-slate-950" to="/register">
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Highlight({ icon, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
      <div className="inline-flex items-center gap-2 text-xs font-black text-slate-900">
        {icon}
        {label}
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
