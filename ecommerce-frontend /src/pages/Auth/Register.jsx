import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import useAuthStore from "../../store/auth.store";

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: "", email: "", password: "" },
  });

  function onSubmit(values) {
    login({ id: values.email, name: values.name, email: values.email }, "customer");
    navigate("/account");
  }

  return (
    <div className="ec-container">
      <div className="py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit(onSubmit)} className="ec-surface p-6">
            <h1 className="text-2xl font-black text-slate-950">Create your account</h1>
            <p className="mt-1 text-slate-700">
              Join to save details and track orders later.
            </p>

            <div className="mt-6 space-y-4">
              <Field label="Full Name" error={errors.name?.message}>
                <input
                  {...register("name", { required: "Name is required" })}
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>

              <Field label="Email" error={errors.email?.message}>
                <input
                  {...register("email", { required: "Email is required" })}
                  placeholder="you@example.com"
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
                  placeholder="Min 6 characters"
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-600"
                />
              </Field>

              <button className="w-full ec-btn-primary">Create account (Mock)</button>

              <p className="text-xs text-slate-700">
                Already have an account?{" "}
                <Link className="font-black underline text-slate-950" to="/login">
                  Login
                </Link>
              </p>
            </div>
          </form>

          <div className="ec-surface p-8">
            <div className="text-2xl font-black text-slate-950">Why register?</div>
            <ul className="mt-4 space-y-2 text-slate-700 text-sm list-disc pl-5">
              <li>Faster checkout experience</li>
              <li>Order history & tracking (coming soon)</li>
              <li>Saved delivery details (later)</li>
            </ul>

            <div className="mt-6 ec-surface-soft p-5">
              <div className="font-black text-slate-950">Student Project Note</div>
              <div className="mt-1 text-sm text-slate-700">
                Auth is mock right now. Later we’ll connect Django JWT auth.
              </div>
            </div>
          </div>
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
