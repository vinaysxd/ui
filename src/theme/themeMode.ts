import { DevSettings, Platform } from "react-native";
import { reloadAppAsync } from "expo";
import { storeThemeMode, ThemeMode } from "../constants/theme";
import { showError } from "../utils/toast";

// Styles are built once at import time, so switching theme saves the choice and
// reloads the app; the new palette is picked up on startup.
export async function setThemeMode(mode: ThemeMode) {
  try {
    storeThemeMode(mode);
  } catch (err: any) {
    showError(`Couldn't save theme: ${err?.message ?? err}`);
    return;
  }

  if (Platform.OS === "web") {
    window.location.reload();
    return;
  }

  // Expo Go / dev builds: reload the JS bundle through React Native directly,
  // which is reliable there. Release builds use expo's reloadAppAsync.
  if (__DEV__) {
    try {
      DevSettings.reload();
      return;
    } catch {
      // fall through to reloadAppAsync
    }
  }

  try {
    await reloadAppAsync("Theme changed");
  } catch {
    showError("Theme saved. Close and reopen the app to apply it.");
  }
}
