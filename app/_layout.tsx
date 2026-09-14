import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, usePathname, useSegments, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { getToken, getUser } from '../src/store/auth';

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

  if (!initialCheckDone) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
