export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-slate-600">{subtitle}</p> : null}
    </div>
  );
}