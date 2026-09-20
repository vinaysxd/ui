import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '../../src/services/auth.service';
import { showError } from '../../src/utils/toast';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
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
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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
          placeholderTextColor="#666666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor="#666666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity style={styles.loginButton} onPress={loginHandler} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.loginButtonText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotLink} onPress={() => router.push("/auth/forgot-password")}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
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
    marginBottom: 16,
  },
  brand: {
    color: "#C9A84C",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 6,
    textAlign: "center",
  },
  tagline: {
    color: "#666666",
    fontSize: 13,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#C9A84C",
    marginTop: 24,
    marginBottom: 32,
    opacity: 0.4,
  },
  label: {
    color: "#666666",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 12,
    color: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: "#C9A84C",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "#000000",
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 15,
  },
  forgotLink: {
    alignSelf: "center",
    marginTop: 16,
  },
  forgotText: {
    color: "#C9A84C",
    fontSize: 13,
  },
  errorText: {
    color: "#E53935",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
});
