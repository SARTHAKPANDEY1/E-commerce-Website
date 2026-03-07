import { useEffect, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function Container({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function handleToast(e) {
      const id = Date.now();
      const toast = { id, ...e.detail };
      setToasts((prev) => [...prev, toast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    }

    window.addEventListener("ec-toast", handleToast);
    return () => window.removeEventListener("ec-toast", handleToast);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Toast Container */}
      <div className="ec-toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`ec-toast ${
              t.type === "error"
                ? "ec-toast-error"
                : "ec-toast-success"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}