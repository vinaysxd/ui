import { useCallback, useEffect, useState } from 'react';
import { Stack, ThemeProvider, usePathname, useSegments, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getToken, getUser } from '../src/store/auth';
// App is always dark-themed today (see docs/paper-migration/DESIGN_RULES.md
// "Theme mode") — darkTheme/navigationDarkTheme are the only ones wired up.
import { darkTheme, navigationDarkTheme } from '../src/theme/paperTheme';

SplashScreen.preventAutoHideAsync();

const dashboardForRole = (role: string | undefined) => {
  switch (role) {
    case 'admin':
      return '/(admin)/dashboard' as const;
    case 'staff':
      return '/(staff)/dashboard' as const;
    case 'client':
      return '/(client)/dashboard' as const;
    default:
      return null;
  }
};

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  const loadAssets = useCallback(async () => {
    try {
      await Asset.loadAsync(require('../assets/brothers_logo.png'));
    } catch {
      // Preload is best-effort; the Image still renders via require() if this fails.
    } finally {
      setAssetsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    const checkAuth = async () => {
      const [token, user] = await Promise.all([getToken(), getUser()]);
      const role = user?.role;
      const group = segments[0] as string | undefined;
      const onAuthScreen = pathname.startsWith('/auth');

      if (!token) {
        if (!onAuthScreen) {
          router.replace('/auth/login');
        }
        setInitialCheckDone(true);
        return;
      }

      // No index.tsx redirect of its own anymore, so the bare "/" landing
      // spot needs the same "send them to their dashboard" treatment as
      // /auth/login.
      if (pathname === '/' || pathname === '/auth/login') {
        const target = dashboardForRole(role);
        if (target) {
          router.replace(target);
        }
        setInitialCheckDone(true);
        return;
      }

      if (group === '(admin)' && role !== 'admin') {
        router.replace('/auth/login');
      } else if (group === '(staff)' && role !== 'staff') {
        router.replace('/auth/login');
      } else if (group === '(client)' && role !== 'client') {
        router.replace('/auth/login');
      }

      setInitialCheckDone(true);
    };

    checkAuth();
  }, [pathname]);

  const [splashDelayDone, setSplashDelayDone] = useState(false);
  const loaded = assetsLoaded && initialCheckDone;
  const ready = loaded && splashDelayDone;

  // Once assets and auth are ready, keep the splash up for 3 more seconds.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      setSplashDelayDone(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [loaded]);

  if (!ready) {
    return null;
  }

  return (
    <PaperProvider
      theme={darkTheme}
      settings={{
        icon: ({ name, color, size }) => (
          <MaterialCommunityIcons name={name} color={color} size={size} />
        ),
      }}
    >
      <ThemeProvider value={navigationDarkTheme}>
        <>
          <Stack screenOptions={{ headerShown: false }} />
          <Toast />
        </>
      </ThemeProvider>
    </PaperProvider>
  );
}
