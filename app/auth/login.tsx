import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../../src/services/auth.service';
import { showError } from '../../src/utils/toast';
import { COLORS, LIGHT_COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>("vinaysandesh35@gmail.com");
  const [password, setPassword] = useState<string>("qwerty123!");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isDark, setIsDark] = useState<boolean>(false);
  const router = useRouter();

  const palette = isDark ? COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(palette), [palette]);

  const gradientColors: [string, string, string] = isDark
    ? ["#0D0D0D", "#1A1A1A", "#0D0D0D"]
    : ["#FFFFFF", "#FAF8F3", "#FFFFFF"];

  const glowColors: [string, string] = isDark
    ? ["#C9A84C10", "transparent"]
    : ["#C9A84C22", "transparent"];

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
    <LinearGradient colors={gradientColors} style={styles.screen}>
      <View style={styles.topLine} />

      <LinearGradient
        colors={glowColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.accentGlow}
        pointerEvents="none"
      />

      <View style={[styles.circle, styles.circle1]} pointerEvents="none" />
      <View style={[styles.circle, styles.circle2]} pointerEvents="none" />
      <View style={[styles.circle, styles.circle3]} pointerEvents="none" />
      <View style={[styles.circle, styles.circle4]} pointerEvents="none" />

      <TouchableOpacity
        style={styles.themeToggle}
        onPress={() => setIsDark((prev) => !prev)}
      >
        <Ionicons
          name={isDark ? "sunny-outline" : "moon-outline"}
          size={20}
          color={palette.gold}
        />
      </TouchableOpacity>

      <View style={styles.form}>
        <Image
          source={require('../../assets/favicon.jpg')}
          style={styles.favicon}
          resizeMode="cover"
        />

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
          placeholderTextColor={palette.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={palette.textMuted}
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

const createStyles = (palette: typeof COLORS) =>
  StyleSheet.create({
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
      backgroundColor: palette.gold,
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
      backgroundColor: palette.gold,
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
    themeToggle: {
      position: "absolute",
      top: SPACING.lg,
      right: SPACING.lg,
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    form: {
      width: "100%",
      maxWidth: 400,
      alignSelf: "center",
    },
    favicon: {
      width: 60,
      height: 60,
      borderRadius: 12,
      alignSelf: "center",
      marginBottom: SPACING.sm,
    },
    logo: {
      width: 180,
      height: 80,
      alignSelf: "center",
      marginBottom: SPACING.md,
    },
    brand: {
      color: palette.gold,
      fontSize: 28,
      fontWeight: "700",
      letterSpacing: 6,
      textAlign: "center",
    },
    tagline: {
      color: palette.textSecondary,
      fontSize: 13,
      letterSpacing: 2,
      textAlign: "center",
      marginTop: SPACING.xs,
    },
    divider: {
      height: 1,
      backgroundColor: palette.gold,
      marginTop: SPACING.lg,
      marginBottom: SPACING.xl,
      opacity: 0.4,
    },
    label: {
      color: palette.textSecondary,
      fontSize: 11,
      letterSpacing: 1.5,
      marginBottom: SPACING.xs,
    },
    input: {
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: RADIUS.md,
      color: palette.textPrimary,
      paddingVertical: 14,
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.md,
      fontSize: 15,
    },
    loginButton: {
      backgroundColor: palette.gold,
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
      color: palette.danger,
      fontSize: 13,
      textAlign: "center",
      marginTop: SPACING.md,
    },
  });
