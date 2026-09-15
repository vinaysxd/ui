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
import { LinearGradient } from 'expo-linear-gradient';
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
    <LinearGradient
      colors={["#0D0D0D", "#1A1A1A", "#0D0D0D"]}
      style={styles.screen}
    >
      <View style={styles.topLine} />

      <LinearGradient
        colors={["#C9A84C10", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.accentGlow}
        pointerEvents="none"
      />

      <View style={[styles.circle, styles.circle1]} pointerEvents="none" />
      <View style={[styles.circle, styles.circle2]} pointerEvents="none" />
      <View style={[styles.circle, styles.circle3]} pointerEvents="none" />
      <View style={[styles.circle, styles.circle4]} pointerEvents="none" />

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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: SPACING.lg,
  },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.gold,
    opacity: 0.6,
  },
  accentGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "60%",
    height: "45%",
  },
  circle: {
    position: "absolute",
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gold,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -80,
    right: -80,
    opacity: 0.04,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 60,
    left: -60,
    opacity: 0.05,
  },
  circle3: {
    width: 150,
    height: 150,
    top: "42%",
    right: 30,
    opacity: 0.03,
  },
  circle4: {
    width: 220,
    height: 220,
    bottom: -100,
    right: 120,
    opacity: 0.04,
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
