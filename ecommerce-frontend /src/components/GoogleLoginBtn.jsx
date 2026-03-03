import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";

const ACCESS_TOKEN_KEY = "ec_access_token_v1";
const REFRESH_TOKEN_KEY = "ec_refresh_token_v1";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.NEXT_PUBLIC_API_BASE ||
  "http://127.0.0.1:8000";

const REDIRECT_URI =
  import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
  import.meta.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
  "http://localhost:3000/auth/google/callback";

export default function GoogleLoginBtn({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "popup",
    redirect_uri: REDIRECT_URI,
    onSuccess: async ({ code }) => {
      setLoading(true);
      try {
        const resp = await fetch(`${API_BASE}/api/auth/google/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code }),
        });

        const data = await resp.json();
        if (!resp.ok || !data?.ok) {
          throw new Error(data?.error || "Google login failed");
        }

        if (data?.tokens?.access && data?.tokens?.refresh) {
          localStorage.setItem(ACCESS_TOKEN_KEY, data.tokens.access);
          localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refresh);
        }

        if (onSuccess) onSuccess(data);
      } catch (error) {
        if (onError) onError(error);
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      if (onError) onError(new Error("Google OAuth failed"));
    },
    onNonOAuthError: (err) => {
      const reason = err?.type || "popup_failed";
      if (onError) onError(new Error(`Google popup error: ${reason}`));
    },
  });

  return (
    <button
      type="button"
      onClick={() => googleLogin()}
      disabled={loading}
      className="group w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_12px_30px_rgba(15,23,42,0.12)] inline-flex items-center justify-center gap-2.5 disabled:opacity-60"
    >
      <GoogleGlyph />
      <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.3 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.1 29.3 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.1 35.1 26.7 36 24 36c-5.3 0-9.8-3.3-11.5-8l-6.6 5.1C9.2 39.5 16 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
