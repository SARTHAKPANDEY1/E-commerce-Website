import client from "../http/client";

const ACCESS_TOKEN_KEY = "ec_access_token_v1";

function authHeaders() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length) return String(data.detail[0]);
  if (typeof data?.sku?.[0] === "string") return data.sku[0];
  if (typeof data?.name?.[0] === "string") return data.name[0];
  if (typeof data?.price?.[0] === "string") return data.price[0];
  return fallback;
}

function mapVendorProduct(apiProduct) {
  return {
    id: apiProduct.id,
    title: apiProduct.name,
    description: apiProduct.description || "",
    price: Number(apiProduct.price || 0),
    stock: Number(apiProduct.stock_quantity || 0),
    sold: 0,
    createdAt: apiProduct.created_at,
    image: "https://picsum.photos/seed/vendor-product/500/320",
    rating: 0,
    vendorId: apiProduct.vendorId,
    vendorName: null,
    sku: apiProduct.sku || "",
    status: apiProduct.is_active ? "active" : "draft",
  };
}

export async function listVendorProducts() {
  try {
    const { data } = await client.get("/api/auth/vendor/products/", {
      headers: authHeaders(),
    });
    return (Array.isArray(data) ? data : []).map(mapVendorProduct);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not load vendor products."));
  }
}

export async function createVendorProduct(payload) {
  try {
    const apiPayload = {
      name: payload.title,
      description: payload.description || "",
      price: payload.price,
      sku: payload.sku || `SKU-${Date.now()}`,
      stock_quantity: payload.stock,
      reserved_quantity: 0,
      is_active: payload.status !== "draft",
    };
    const { data } = await client.post("/api/auth/vendor/products/", apiPayload, {
      headers: authHeaders(),
    });
    return mapVendorProduct(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not create product."));
  }
}

export async function listVendorOrders(params = {}) {
  try {
    const { vendorStatus = "", orderStatus = "", q = "" } = params;
    const query = new URLSearchParams();
    if (vendorStatus) query.set("vendorStatus", vendorStatus);
    if (orderStatus) query.set("orderStatus", orderStatus);
    if (q) query.set("q", q);

    const url = `/api/auth/vendor/orders/${query.toString() ? `?${query.toString()}` : ""}`;
    const { data } = await client.get(url, { headers: authHeaders() });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not load vendor orders."));
  }
}

export async function getVendorOrdersSummary() {
  try {
    const { data } = await client.get("/api/auth/vendor/orders/summary/", {
      headers: authHeaders(),
    });
    return data || {};
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not load order summary."));
  }
}

export async function updateVendorOrderItemStatus(itemId, payload) {
  try {
    const { data } = await client.patch(
      `/api/auth/vendor/orders/items/${itemId}/status/`,
      payload,
      { headers: authHeaders() }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not update order status."));
  }
}
