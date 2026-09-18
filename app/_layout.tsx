import { useCallback, useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Stack, usePathname, useSegments, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { getToken, getUser } from '../src/store/auth';
import { COLORS } from '../src/constants/theme';

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

  const ready = assetsLoaded && initialCheckDone;

  const hideSplash = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  useEffect(() => {
    hideSplash();
  }, [hideSplash]);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('../assets/splash.jpg')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={styles.splashText}>BROTHERS</Text>
      </View>
    );
  }

  return (
      <>
         <Stack screenOptions={{ headerShown: false }} />
         <Toast />
      </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: 200,
    height: 90,
  },
  splashText: {
    marginTop: 16,
    color: COLORS.gold,
    fontSize: 24,
    letterSpacing: 6,
    fontWeight: '700',
  },
});
