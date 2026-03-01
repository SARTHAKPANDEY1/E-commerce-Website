import { create } from "zustand";
import { readJSON, writeJSON } from "../hooks/useLocalStorage";
import useAuthStore from "./auth.store";

const STORAGE_KEY = "ec_cart_v1";

const useCartStore = create((set, get) => ({
  items: readJSON(STORAGE_KEY, []),

  _persist: (nextItems) => {
    writeJSON(STORAGE_KEY, nextItems);
    set({ items: nextItems });
  },

  addItem: (product) => {
    const { role, user } = useAuthStore.getState();
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("ec-toast", {
          detail: {
            type: "error",
            message: "Please login to add items to cart.",
          },
        })
      );
      return;
    }

    if (role === "vendor") {
      window.dispatchEvent(
        new CustomEvent("ec-toast", {
          detail: {
            type: "error",
            message: "Vendors cannot buy products. Switch to a customer account.",
          },
        })
      );
      return;
    }

    const items = get().items;
    const existing = items.find((i) => i.id === product.id);

    let next;
    if (existing) {
      next = items.map((i) =>
        i.id === product.id ? { ...i, qty: i.qty + 1 } : i
      );
    } else {
      next = [
        ...items,
        {
          id: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          qty: 1,
        },
      ];
    }

    get()._persist(next);

    // 🔥 trigger toast
    window.dispatchEvent(
      new CustomEvent("ec-toast", {
        detail: {
          type: "success",
          message: `${product.title} added to cart`,
        },
      })
    );
  },

  removeItem: (id) => {
    const next = get().items.filter((i) => i.id !== id);
    get()._persist(next);
  },

  setQty: (id, qty) => {
    const q = Math.max(1, Number(qty || 1));
    const next = get().items.map((i) =>
      i.id === id ? { ...i, qty: q } : i
    );
    get()._persist(next);
  },

  clear: () => get()._persist([]),
}));

export default useCartStore;
