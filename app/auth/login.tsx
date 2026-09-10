import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { login } from '../../src/services/auth.service';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const loginHandler = async () => {
    console.log("+==========")
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      console.log("USER = ",user)
      if (user.role === "admin") router.replace("/(admin)/dashboard");
      else if (user.role === "staff") router.replace("/(staff)/dashboard");
      else if (user.role === "client") router.replace("/(client)/dashboard");
    } catch (err: any) {
        console.log("USER = ",err)
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 32 }}>
        Brothers Cleaning
      </Text>

      {error ? (
        <Text style={{ color: "red", marginBottom: 16 }}>{error}</Text>
      ) : null}

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8, marginBottom: 16 }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8, marginBottom: 24 }}
      />

      <TouchableOpacity
        style={{ backgroundColor: "#000", padding: 16, borderRadius: 8, alignItems: "center" }}
        onPress={loginHandler}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}