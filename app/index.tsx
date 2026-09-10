import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getToken, getUser } from '../src/store/auth';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getToken();
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const user = await getUser();
      if (user?.role === 'admin') router.replace('/(admin)/dashboard');
      else if (user?.role === 'staff') router.replace('/(staff)/dashboard');
      else if (user?.role === 'client') router.replace('/(client)/dashboard');
      else router.replace('/auth/login');
    };

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
