import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { forgotPassword } from "../../src/services/auth.service";
import { showError } from "../../src/utils/toast";
import { LOADING_STYLE } from "../../src/constants/ui";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const router = useRouter();

  const submitHandler = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
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
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#C9A84C" />
          </TouchableOpacity>

          <View style={styles.form}>
            <Text style={styles.eyebrow}>FORGOT PASSWORD</Text>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your email and we'll send you a reset link</Text>

            <TextInput
              placeholder="you@example.com"
              placeholderTextColor="#666666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <TouchableOpacity
              style={[styles.button, loading && LOADING_STYLE]}
              onPress={submitHandler}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.buttonText}>SEND RESET LINK</Text>
              )}
            </TouchableOpacity>

            {success ? <Text style={styles.successText}>Reset email sent! Check your inbox.</Text> : null}
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
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    marginTop: 32,
  },
  eyebrow: {
    color: "#C9A84C",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#666666",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 32,
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
  button: {
    backgroundColor: "#C9A84C",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#000000",
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 15,
  },
  successText: {
    color: "#4CAF50",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
  errorText: {
    color: "#E53935",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
});
