import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";

const storage = {
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return await AsyncStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const setAuth = async (
  accessToken: string,
  refreshToken: string,
  user: { id: string; email: string; role: string }
) => {
  await storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  await storage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = async (): Promise<string | null> => {
  return await storage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async (): Promise<string | null> => {
  return await storage.getItem(REFRESH_TOKEN_KEY);
};

export const getUser = async (): Promise<{ id: string; email: string; role: string } | null> => {
  const user = await storage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const clearAuth = async () => {
  await storage.deleteItem(ACCESS_TOKEN_KEY);
  await storage.deleteItem(REFRESH_TOKEN_KEY);
  await storage.deleteItem(USER_KEY);
};
