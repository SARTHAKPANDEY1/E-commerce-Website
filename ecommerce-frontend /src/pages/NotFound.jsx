import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="ec-container py-16 text-center">
      <h1 className="text-5xl font-black">404</h1>
      <p className="mt-3 text-slate-600">
        The page you're looking for doesn’t exist.
      </p>

      <Link
        to="/"
        className="inline-flex mt-6 rounded-2xl bg-slate-900 text-white px-6 py-3 text-sm font-black hover:opacity-95"
      >
        Back to Home
      </Link>
    </div>
  );
}