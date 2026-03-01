export default function Input({ label, error, className = "", ...props }) {
  return (
    <div>
      {label ? (
        <label className="text-xs font-semibold text-slate-600">{label}</label>
      ) : null}

      <input
        className={
          "mt-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition " +
          (error
            ? "border-rose-300 focus:ring-2 focus:ring-rose-200"
            : "border-slate-200 focus:ring-2 focus:ring-slate-300") +
          " " +
          className
        }
        {...props}
      />

      {error ? (
        <div className="mt-1 text-xs font-semibold text-rose-600">{error}</div>
      ) : null}
    </div>
  );
}