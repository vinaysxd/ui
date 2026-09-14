import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { inviteClient } from "../../../src/services/client.service";

export default function InviteClientScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [billingAddress, setBillingAddress] = useState<string>("");
  const [contactPerson, setContactPerson] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async () => {
    setError("");

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Full name, email, and phone are all required");
      return;
    }

    setSubmitting(true);
    try {
      await inviteClient({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company_name: companyName.trim() || undefined,
        billing_address: billingAddress.trim() || undefined,
        contact_person: contactPerson.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton onPress={() => router.back()} />

      <Text style={styles.title}>Invite Client</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>Client invitation sent</Text> : null}

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        editable={!submitting && !success}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!submitting && !success}
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!submitting && !success}
      />

      <Text style={styles.label}>Company Name</Text>
      <TextInput
        style={styles.input}
        value={companyName}
        onChangeText={setCompanyName}
        editable={!submitting && !success}
      />

      <Text style={styles.label}>Billing Address</Text>
      <TextInput
        style={styles.input}
        value={billingAddress}
        onChangeText={setBillingAddress}
        editable={!submitting && !success}
      />

      <Text style={styles.label}>Contact Person</Text>
      <TextInput
        style={styles.input}
        value={contactPerson}
        onChangeText={setContactPerson}
        editable={!submitting && !success}
      />

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={submitting || success}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Send Invite</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.backButton} onPress={onPress}>
      <Ionicons name="arrow-back" size={20} color="#000" />
      <Text style={styles.backButtonText}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: "#000",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  errorText: {
    color: "red",
    marginBottom: 16,
  },
  successText: {
    color: "#16a34a",
    fontWeight: "600",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  submitButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
