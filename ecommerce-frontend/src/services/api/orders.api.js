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
  if (Array.isArray(data?.items) && data.items.length && typeof data.items[0] === "string") {
    return data.items[0];
  }
  if (Array.isArray(data?.items) && data.items.length && typeof data.items[0] === "object") {
    const firstItem = data.items[0];
    const firstKey = Object.keys(firstItem)[0];
    const firstValue = firstKey ? firstItem[firstKey] : null;
    if (Array.isArray(firstValue) && firstValue.length) return `items.${firstKey}: ${firstValue[0]}`;
  }
  for (const key of ["fullName", "phone", "email", "address", "city", "state", "pincode", "reason"]) {
    if (Array.isArray(data?.[key]) && data[key].length) return `${key}: ${data[key][0]}`;
  }
  return fallback;
}

export async function placeOrder(payload) {
  try {
    const { data } = await client.post("/api/auth/orders/place/", payload, {
      headers: authHeaders(),
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not place order."));
  }
}

export async function listMyOrders() {
  try {
    const { data } = await client.get("/api/auth/orders/my/", {
      headers: authHeaders(),
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not load your orders."));
  }
}

export async function getMyOrderDetail(orderId) {
  try {
    const { data } = await client.get(`/api/auth/orders/my/${orderId}/`, {
      headers: authHeaders(),
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not load order details."));
  }
}

export async function cancelMyOrder(orderId, reason) {
  try {
    const { data } = await client.post(
      `/api/auth/orders/my/${orderId}/cancel/`,
      { reason },
      { headers: authHeaders() }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not cancel order."));
  }
}
