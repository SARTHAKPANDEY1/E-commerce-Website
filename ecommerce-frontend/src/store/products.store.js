import { create } from "zustand";
import { products as baseProducts } from "../data/mock/products";
import { readJSON, writeJSON } from "../hooks/useLocalStorage";

const PRODUCTS_KEY = "ec_products_v1";

// Persist vendor-created products and runtime inventory changes.
const initialPersisted = readJSON(PRODUCTS_KEY, {
  vendorProducts: [],
  inventoryById: {},
  nextVendorProductId: 10001,
});

function withDefaults(product) {
  return {
    ...product,
    sold: Number(product.sold ?? 0),
    stock: Number(product.stock ?? 0),
    createdAt: product.createdAt || new Date().toISOString(),
    vendorId: product.vendorId || null,
    vendorName: product.vendorName || null,
    description: product.description || "",
    sku: product.sku || "",
    status: product.status || "active",
  };
}

function toProductMap(allProducts) {
  return allProducts.reduce((acc, product) => {
    acc[String(product.id)] = product;
    return acc;
  }, {});
}

const useProductsStore = create((set, get) => ({
  vendorProducts: Array.isArray(initialPersisted.vendorProducts)
    ? initialPersisted.vendorProducts.map(withDefaults)
    : [],
  inventoryById: initialPersisted.inventoryById || {},
  nextVendorProductId: Number(initialPersisted.nextVendorProductId || 10001),

  _persist: (partial) => {
    const nextState = {
      vendorProducts: partial.vendorProducts,
      inventoryById: partial.inventoryById,
      nextVendorProductId: partial.nextVendorProductId,
    };
    writeJSON(PRODUCTS_KEY, nextState);
    set(nextState);
  },

  // Unified list for UI/API layer (base mock + vendor products + checkout patches).
  getAllProducts: () => {
    const { vendorProducts, inventoryById } = get();
    const merged = [...baseProducts, ...vendorProducts].map((p) => {
      const patch = inventoryById[String(p.id)];
      if (!patch) return withDefaults(p);
      return withDefaults({ ...p, ...patch });
    });

    return merged;
  },

  getProductById: (id) => {
    const all = get().getAllProducts();
    return all.find((p) => String(p.id) === String(id)) || null;
  },

  addVendorProduct: (payload, vendor) => {
    const { vendorProducts, inventoryById, nextVendorProductId } = get();

    const newProduct = withDefaults({
      id: nextVendorProductId,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      price: Number(payload.price),
      stock: Number(payload.stock),
      sold: 0,
      createdAt: new Date().toISOString(),
      image: payload.image,
      rating: 0,
      vendorId: vendor?.id || vendor?.email || "vendor-unknown",
      vendorName: vendor?.organizationName || vendor?.name || null,
      sku: payload.sku || "",
      status: payload.status || "active",
    });

    get()._persist({
      vendorProducts: [...vendorProducts, newProduct],
      inventoryById,
      nextVendorProductId: nextVendorProductId + 1,
    });

    return newProduct;
  },

  upsertVendorProduct: (product) => {
    const { vendorProducts, inventoryById, nextVendorProductId } = get();
    const normalized = withDefaults({
      ...product,
      id: Number(product?.id),
      title: product?.title || product?.name || "Untitled Product",
      stock: Number(product?.stock ?? product?.stock_quantity ?? 0),
      createdAt: product?.createdAt || product?.created_at || new Date().toISOString(),
      status:
        product?.status ||
        (typeof product?.is_active === "boolean" ? (product.is_active ? "active" : "draft") : "active"),
    });

    const exists = vendorProducts.some((p) => String(p.id) === String(normalized.id));
    const nextVendorProducts = exists
      ? vendorProducts.map((p) => (String(p.id) === String(normalized.id) ? normalized : p))
      : [normalized, ...vendorProducts];

    get()._persist({
      vendorProducts: nextVendorProducts,
      inventoryById,
      nextVendorProductId,
    });

    return normalized;
  },

  // Checkout mutation hook for mock backend readiness.
  applyCheckout: (items) => {
    const { inventoryById, vendorProducts, nextVendorProductId } = get();
    const productMap = toProductMap(get().getAllProducts());
    const nextInventory = { ...inventoryById };

    for (const item of items || []) {
      const key = String(item.id);
      const product = productMap[key];
      if (!product) continue;

      const qty = Math.max(0, Number(item.qty || 0));
      if (qty <= 0) continue;

      const nextStock = Math.max(0, Number(product.stock || 0) - qty);
      const nextSold = Math.max(0, Number(product.sold || 0) + qty);

      nextInventory[key] = {
        stock: nextStock,
        sold: nextSold,
      };
    }

    get()._persist({
      vendorProducts,
      inventoryById: nextInventory,
      nextVendorProductId,
    });
  },

  getVendorStats: (vendorId) => {
    const myProducts = get()
      .getAllProducts()
      .filter((p) => String(p.vendorId) === String(vendorId));

    return {
      totalProducts: myProducts.length,
      totalSold: myProducts.reduce((sum, p) => sum + Number(p.sold || 0), 0),
      totalStock: myProducts.reduce((sum, p) => sum + Number(p.stock || 0), 0),
    };
  },
}));

export default useProductsStore;
