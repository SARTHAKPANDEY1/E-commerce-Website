import { create } from "zustand";
import { readJSON, writeJSON } from "../hooks/useLocalStorage";
import { clearAuthTokens } from "../services/api/auth.api";

const AUTH_KEY = "ec_auth_v1";
const WISHLIST_KEY = "ec_wishlist_v1";
const CUSTOMER_ROLE = "customer";

function readSession() {
  const raw = readJSON(AUTH_KEY, null);
  if (!raw) return { user: null, role: null };

  // Backward compatibility for older shape where auth key stored only user object.
  if (raw.user) {
    return {
      user: raw.user,
      role: raw.role || raw.user.role || CUSTOMER_ROLE,
    };
  }

  return {
    user: raw,
    role: raw.role || CUSTOMER_ROLE,
  };
}

const useAuthStore = create((set, get) => ({
  ...readSession(),
  wishlist: readJSON(WISHLIST_KEY, []), // array of product ids

  login: (user, role = CUSTOMER_ROLE) => {
    const normalizedRole = role === "vendor" ? "vendor" : CUSTOMER_ROLE;
    const normalizedUser = {
      ...user,
      id: user?.id || user?.email || `user-${Date.now()}`,
    };

    const nextSession = { user: normalizedUser, role: normalizedRole };
    writeJSON(AUTH_KEY, nextSession);
    set(nextSession);
  },

  logout: () => {
    writeJSON(AUTH_KEY, null);
    clearAuthTokens();
    set({ user: null, role: null });
  },

  isVendor: () => get().role === "vendor",

  isCustomer: () => get().role !== "vendor",

  isWishlisted: (productId) => {
    const list = get().wishlist || [];
    return list.includes(productId);
  },

  toggleWishlist: (productId) => {
    const current = get().wishlist || [];
    let next;

    if (current.includes(productId)) {
      next = current.filter((id) => id !== productId);
      window.dispatchEvent(
        new CustomEvent("ec-toast", {
          detail: { type: "success", message: "Removed from wishlist" },
        })
      );
    } else {
      next = [...current, productId];
      window.dispatchEvent(
        new CustomEvent("ec-toast", {
          detail: { type: "success", message: "Saved to wishlist" },
        })
      );
    }

    writeJSON(WISHLIST_KEY, next);
    set({ wishlist: next });
  },
}));

export default useAuthStore;
