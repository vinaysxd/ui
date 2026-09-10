import axios from "axios";
import { getToken, getRefreshToken, setAuth, clearAuth } from "../store/auth";

const api = axios.create({
  baseURL: "http://localhost:3000",
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

api.interceptors.response.use( 
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await clearAuth();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post("http://localhost:3000/auth/refresh", {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token, user } = response.data;
        await setAuth(access_token, refresh_token, user);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch {
        await clearAuth();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;