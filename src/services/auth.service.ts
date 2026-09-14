import api from "../lib/api";
import { setAuth, clearAuth } from "../store/auth";
import { getErrorMessage } from "../constants/errors";

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    const { access_token, refresh_token, user } = response.data;
    await setAuth(access_token, refresh_token, user);
    return user;
  } catch (error: any) {
    console.log("ERROR= ",error)
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    // ignore error, still clear local auth
  } finally {
    await clearAuth();
  }
};
