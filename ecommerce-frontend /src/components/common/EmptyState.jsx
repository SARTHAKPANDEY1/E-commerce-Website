import { Link } from "react-router-dom";

export default function EmptyState({
  title,
  subtitle,
  actionHref,
  actionText,
}) {
  return (
    <div className="ec-surface p-10 text-center">
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-2 text-slate-700">{subtitle}</p>

      {actionHref && (
        <Link to={actionHref} className="inline-flex mt-6 ec-btn-primary">
          {actionText}
        </Link>
      )}
    </div>
  );
}