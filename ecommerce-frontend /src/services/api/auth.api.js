import client from "../http/client";

const ACCESS_TOKEN_KEY = "ec_access_token_v1";
const REFRESH_TOKEN_KEY = "ec_refresh_token_v1";

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length) return String(data.detail[0]);

  if (typeof data?.email?.[0] === "string") return data.email[0];
  if (typeof data?.password?.[0] === "string") return data.password[0];
  if (typeof data?.organizationName?.[0] === "string") return data.organizationName[0];

  return fallback;
}

function persistTokens(tokens) {
  if (!tokens?.access || !tokens?.refresh) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function requestRegistrationOtp(payload) {
  try {
    const { data } = await client.post("/api/auth/register/request-otp/", payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not send OTP. Please try again."));
  }
}

export async function verifyRegistrationOtp(payload) {
  try {
    const { data } = await client.post("/api/auth/register/verify-otp/", payload);
    persistTokens(data.tokens);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "OTP verification failed."));
  }
}

export async function resendRegistrationOtp(payload) {
  try {
    const { data } = await client.post("/api/auth/register/resend-otp/", payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not resend OTP."));
  }
}

export async function loginUser(payload) {
  try {
    const { data } = await client.post("/api/auth/login/", payload);
    persistTokens(data.tokens);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Login failed. Please try again."));
  }
}

export async function fetchMyProfile() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) throw new Error("No access token found");

  try {
    const { data } = await client.get("/api/auth/me/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch profile"));
  }
}
