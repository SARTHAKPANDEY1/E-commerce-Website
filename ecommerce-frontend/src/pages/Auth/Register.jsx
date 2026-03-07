import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Building2, CheckCircle2, CreditCard, MailCheck, Package, Shield, Store } from "lucide-react";
import useAuthStore from "../../store/auth.store";
import GoogleLoginBtn from "../../components/GoogleLoginBtn";
import {
  requestRegistrationOtp,
  resendRegistrationOtp,
  verifyRegistrationOtp,
} from "../../services/api/auth.api";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  import.meta.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "";

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [backendError, setBackendError] = useState("");
  const [backendSuccess, setBackendSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("customer");

  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPayload, setPendingPayload] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { name: "", email: "", password: "", organizationName: "" },
  });

  async function onRequestOtp(values) {
    setBackendError("");
    setBackendSuccess("");
    setIsSubmitting(true);

    const payload = {
      name: String(values.name || "").trim(),
      email: String(values.email || "").trim().toLowerCase(),
      password: values.password,
      role: selectedRole,
      organizationName:
        selectedRole === "vendor"
          ? String(values.organizationName || "").trim()
          : null,
    };

    try {
      const res = await requestRegistrationOtp(payload);
      setPendingPayload(payload);
      setPendingEmail(payload.email);
      setOtpStep(true);
      setBackendSuccess(res.detail || "OTP sent to your email address.");
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onVerifyOtp() {
    setBackendError("");
    setBackendSuccess("");
    setIsSubmitting(true);

    try {
      const response = await verifyRegistrationOtp({
        email: pendingEmail,
        otp: String(otp || "").trim(),
        role: pendingPayload?.role || selectedRole,
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
      navigate("/account");
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResendOtp() {
    if (!pendingEmail) return;
    setBackendError("");
    setBackendSuccess("");
    setIsSubmitting(true);

    try {
      const res = await resendRegistrationOtp({
        email: pendingEmail,
        role: pendingPayload?.role || selectedRole,
      });
      setBackendSuccess(res.detail || "OTP resent to your email address.");
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onChangeEmailAndResend() {
    if (!pendingPayload) return;
    setBackendError("");
    setBackendSuccess("");
    setIsSubmitting(true);

    try {
      const res = await requestRegistrationOtp(pendingPayload);
      setBackendSuccess(res.detail || "New OTP sent to your email address.");
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
    setBackendError(error?.message || "Google login failed");
  }

  return (
    <div className="ec-container">
      <div className="py-8">
        <div className="grid lg:grid-cols-[1.02fr_.98fr] gap-6 items-stretch">
          <section className="ec-surface p-6 sm:p-8">
            <div className="ec-pill inline-flex">Create Account</div>
            <h1 className="mt-3 text-3xl sm:text-4xl leading-tight font-black tracking-tight text-slate-950">
              Start shopping smarter
            </h1>
            <p className="mt-2 text-slate-700">
              Register with your email and verify OTP to confirm the email is correct.
            </p>

            {!otpStep ? (
              <form onSubmit={handleSubmit(onRequestOtp)} className="mt-6 space-y-4">
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
                  <label className="text-xs font-black text-slate-800">Register As</label>
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

                <Field label="Full Name" error={errors.name?.message}>
                  <input
                    {...register("name", { required: "Name is required" })}
                    placeholder="Enter your full name"
                    className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-3 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                  />
                </Field>

                {selectedRole === "vendor" ? (
                  <Field label="Organization Name" error={errors.organizationName?.message}>
                    <input
                      {...register("organizationName", {
                        validate: (value) =>
                          selectedRole !== "vendor" ||
                          String(value || "").trim().length > 1 ||
                          "Organization name is required for vendor registration",
                      })}
                      placeholder="Enter your organization name"
                      className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-3 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                    />
                  </Field>
                ) : null}

                <Field label="Email" error={errors.email?.message}>
                  <input
                    {...register("email", { required: "Email is required" })}
                    placeholder="you@example.com"
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
                      placeholder="Min 6 characters"
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

                {backendError ? (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-black text-rose-700">
                    {backendError}
                  </div>
                ) : null}

                {backendSuccess ? (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
                    {backendSuccess}
                  </div>
                ) : null}

                <button className="w-full ec-btn-primary py-3 disabled:opacity-60" disabled={isSubmitting}>
                  {isSubmitting ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
                    <MailCheck size={16} className="text-blue-700" />
                    Verify OTP
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    We sent a 6-digit OTP to <span className="font-black">{pendingEmail}</span>
                  </p>
                </div>

                <Field label="Enter OTP">
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-3 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                  />
                </Field>

                {backendError ? (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-black text-rose-700">
                    {backendError}
                  </div>
                ) : null}

                {backendSuccess ? (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
                    {backendSuccess}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onVerifyOtp}
                    className="ec-btn-primary disabled:opacity-60"
                    disabled={isSubmitting || String(otp).trim().length !== 6}
                  >
                    {isSubmitting ? "Verifying..." : "Verify OTP & Register"}
                  </button>

                  <button
                    type="button"
                    onClick={onResendOtp}
                    className="ec-btn-ghost disabled:opacity-60"
                    disabled={isSubmitting}
                  >
                    Resend OTP
                  </button>

                  <button
                    type="button"
                    onClick={onChangeEmailAndResend}
                    className="ec-btn-ghost disabled:opacity-60"
                    disabled={isSubmitting}
                  >
                    Change details & resend
                  </button>
                </div>
              </div>
            )}

            <p className="mt-5 text-xs text-slate-700 text-center">
              Already have an account?{" "}
              <Link className="font-black underline text-slate-950" to="/login">
                Login
              </Link>
            </p>
          </section>

          <section className="ec-surface p-6 sm:p-8 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.12),transparent_45%),linear-gradient(180deg,rgba(248,250,252,.96),rgba(241,245,249,.95))]">
            <h2 className="text-2xl font-black text-slate-950">Why shoppers choose us</h2>
            <p className="mt-2 text-slate-700">
              Designed for smooth browsing, safe checkout, and quick delivery updates.
            </p>

            <div className="mt-6 grid gap-3">
              <Benefit
                icon={<Shield size={18} className="text-emerald-700" />}
                title="Secure account"
                text="Your account gives you safer and quicker repeat checkouts."
              />
              <Benefit
                icon={<Package size={18} className="text-blue-700" />}
                title="Track orders"
                text="View order status, payment status, and delivery updates anytime."
              />
              <Benefit
                icon={<CreditCard size={18} className="text-indigo-700" />}
                title="Flexible payments"
                text="Use your preferred payment option during checkout."
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white/75 p-4">
              <div className="text-sm font-black text-slate-900">Included with every account</div>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Email verification with OTP for trusted account creation
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Quick access to your order history
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Benefit({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
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
