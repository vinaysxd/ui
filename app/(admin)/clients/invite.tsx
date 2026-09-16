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
import { showSuccess, showError } from "../../../src/utils/toast";
import { COLORS, RADIUS } from "../../../src/constants/theme";

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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleBack = () => {
    
      router.replace("/(admin)/clients");
   
  };

  const handleSubmit = async () => {
    setError("");
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Full name, email, and phone are all required");
      showError("Full name, email, and phone are all required");
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
      showSuccess("Client invitation sent");
      handleBack();
    } catch (err: any) {
      setError(err.message);
      showError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.maxWidthWrap}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.gold} />
        </TouchableOpacity> 
        <Text style={styles.eyebrow}>INVITE</Text>
        <Text style={styles.title}>New Client</Text> 
        <View style={styles.card}>
          <FormField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            editable={!submitting}
            focused={focusedField === "fullName"}
            onFocus={() => setFocusedField("fullName")}
            onBlur={() => setFocusedField(null)}
          /> 
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!submitting}
            focused={focusedField === "email"}
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
          /> 
          <FormField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!submitting}
            focused={focusedField === "phone"}
            onFocus={() => setFocusedField("phone")}
            onBlur={() => setFocusedField(null)}
          /> 
          <FormField
            label="Company Name (Optional)"
            value={companyName}
            onChangeText={setCompanyName}
            editable={!submitting}
            focused={focusedField === "companyName"}
            onFocus={() => setFocusedField("companyName")}
            onBlur={() => setFocusedField(null)}
          /> 
          <FormField
            label="Billing Address (Optional)"
            value={billingAddress}
            onChangeText={setBillingAddress}
            editable={!submitting}
            focused={focusedField === "billingAddress"}
            onFocus={() => setFocusedField("billingAddress")}
            onBlur={() => setFocusedField(null)}
          /> 
          <FormField
            label="Contact Person (Optional)"
            value={contactPerson}
            onChangeText={setContactPerson}
            editable={!submitting}
            focused={focusedField === "contactPerson"}
            onFocus={() => setFocusedField("contactPerson")}
            onBlur={() => setFocusedField(null)}
            last
          /> 
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.submitButtonText}>SEND INVITATION</Text>
            )}
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  editable,
  focused,
  onFocus,
  onBlur,
  autoCapitalize,
  keyboardType,
  last,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "phone-pad";
  last?: boolean;
}) {
  return (
    <View style={!last ? styles.fieldSpacing : undefined}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  maxWidthWrap: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  eyebrow: {
    color: COLORS.gold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#242424",
    borderRadius: RADIUS.xl,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  fieldSpacing: {
    marginBottom: 16,
  },
  label: {
    color: "#666666",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#2E2E2E",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: RADIUS.md,
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: COLORS.gold,
  },
  submitButton: {
    backgroundColor: COLORS.gold,
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#1A1A1A",
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 14,
  },
  errorText: {
    color: "#E53935",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
});
