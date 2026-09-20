import axios from "axios";
import { router } from "expo-router";
import { getToken, getRefreshToken, setAuth, clearAuth } from "../store/auth";
import app_constants from "../constants/app_constants";

const api = axios.create({
  baseURL: app_constants.baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Shared so concurrent 401s trigger a single refresh (refresh tokens are rotated).
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = await getRefreshToken();
  console.log("Refresh token:", refreshToken);
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  // Plain axios (not `api`) so this call never goes through the interceptors below.
  const response = await axios.post(`${app_constants.baseUrl}/auth/refresh`, {
    refresh_token: refreshToken,
  });
  console.log("Refresh response:", response.data);

  const { access_token, refresh_token, user } = response.data;
  await setAuth(access_token, refresh_token, user);
  return access_token;
};

const redirectToLogin = async () => {
  await clearAuth();
  try {
    router.replace("/auth/login");
  } catch (navError) {
    console.log("Redirect to login failed:", navError);
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url: string = originalRequest?.url ?? "";
    const skipRefresh = url.includes("/auth/refresh") || url.includes("/auth/login");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !skipRefresh) {
      originalRequest._retry = true;
      console.log("401 received, attempting refresh");

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const accessToken = await refreshPromise;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.log("Refresh error:", refreshError);
        await redirectToLogin();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
