import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { login } from '../../src/services/auth.service';
import { showError } from '../../src/utils/toast';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>("vinaysandesh35@gmail.com");
  const [password, setPassword] = useState<string>("qwerty123!");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const loginHandler = async () => {
    setLoading(true);
    setError("");
    try {
      const user = await login(email, password);
      if (user.role === "admin") router.replace("/(admin)/dashboard");
      else if (user.role === "staff") router.replace("/(staff)/dashboard");
      else if (user.role === "client") router.replace("/(client)/dashboard");
    } catch (err: any) {
      setError(err.message);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.form}>
        <Image
          source={require('../../assets/brothers_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.brand}>BROTHERS</Text>
        <Text style={styles.tagline}>Facility Management Portal</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={COLORS.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity style={styles.loginButton} onPress={loginHandler} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#1A1A1A" />
          ) : (
            <Text style={styles.loginButtonText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  logo: {
    width: 180,
    height: 80,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  brand: {
    color: COLORS.gold,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 6,
    textAlign: "center",
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 13,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gold,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    opacity: 0.4,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: COLORS.gold,
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  loginButtonText: {
    color: "#1A1A1A",
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 15,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: "center",
    marginTop: SPACING.md,
  },
});
