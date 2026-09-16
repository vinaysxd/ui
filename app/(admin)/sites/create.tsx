import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createSite } from "../../../src/services/sites.service";
import { getAllClients, Client } from "../../../src/services/client.service";
import { showSuccess, showError } from "../../../src/utils/toast";
import { COLORS, RADIUS } from "../../../src/constants/theme";

export default function CreateSiteScreen() {
  const router = useRouter();

  const [name, setName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState<boolean>(true);
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await getAllClients();
        setClients(data.filter((client) => client.is_active));
      } catch (err: any) {
        showError(err.message);
      } finally {
        setClientsLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleBack = () => {
    
      router.replace("/(admin)/sites");
    
  };

  const handleSelectClient = (client: Client) => {
    setClientId(client.id);
    setSelectedClient(client);
    setPickerVisible(false);
  };

  const handleSubmit = async () => {
    setError("");

    if (!name.trim() || !address.trim() || !latitude.trim() || !longitude.trim() || !clientId) {
      const message = "Name, address, latitude, longitude, and client are all required";
      setError(message);
      showError(message);
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      const message = "Latitude must be a number between -90 and 90";
      setError(message);
      showError(message);
      return;
    }

    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      const message = "Longitude must be a number between -180 and 180";
      setError(message);
      showError(message);
      return;
    }

    setSubmitting(true);
    try {
      await createSite({
        name: name.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        client_id: clientId,
      });
      showSuccess("Site created");
      handleBack();
    } catch (err: any) {
      setError(err.message);
      showError(err.message);
      setSubmitting(false);
    }
  };

  const clientDisplayLabel = (client: Client): string =>
    client.company_name ? `${client.full_name} (${client.company_name})` : client.full_name;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.maxWidthWrap}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.gold} />
        </TouchableOpacity>

        <Text style={styles.eyebrow}>CREATE</Text>
        <Text style={styles.title}>New Site</Text>

        <View style={styles.card}>
          <FormField
            label="Site Name"
            value={name}
            onChangeText={setName}
            editable={!submitting}
            focused={focusedField === "name"}
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
          />

          <FormField
            label="Address"
            value={address}
            onChangeText={setAddress}
            editable={!submitting}
            focused={focusedField === "address"}
            onFocus={() => setFocusedField("address")}
            onBlur={() => setFocusedField(null)}
          />

          <FormField
            label="Latitude"
            value={latitude}
            onChangeText={setLatitude}
            keyboardType="numbers-and-punctuation"
            editable={!submitting}
            focused={focusedField === "latitude"}
            onFocus={() => setFocusedField("latitude")}
            onBlur={() => setFocusedField(null)}
          />

          <FormField
            label="Longitude"
            value={longitude}
            onChangeText={setLongitude}
            keyboardType="numbers-and-punctuation"
            editable={!submitting}
            focused={focusedField === "longitude"}
            onFocus={() => setFocusedField("longitude")}
            onBlur={() => setFocusedField(null)}
          />

          <View style={styles.fieldSpacing}>
            <Text style={styles.label}>Client</Text>
            {clientsLoading ? (
              <ActivityIndicator style={styles.clientLoading} color={COLORS.gold} />
            ) : (
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setPickerVisible(true)}
                disabled={submitting}
              >
                <Text style={selectedClient ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {selectedClient ? clientDisplayLabel(selectedClient) : "Select a client"}
                </Text>
                <Ionicons name="chevron-down-outline" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.submitButtonText}>CREATE SITE</Text>
            )}
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>

      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close-outline" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={clients}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.emptyText}>No active clients found.</Text>}
              renderItem={({ item }) => {
                const isSelected = item.id === clientId;
                return (
                  <TouchableOpacity style={styles.modalRow} onPress={() => handleSelectClient(item)}>
                    <Text style={[styles.modalRowText, isSelected && styles.modalRowTextSelected]}>
                      {clientDisplayLabel(item)}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color={COLORS.gold} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "phone-pad" | "numbers-and-punctuation";
}) {
  return (
    <View style={styles.fieldSpacing}>
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
  clientLoading: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2E2E2E",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 15,
    color: COLORS.gold,
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: COLORS.textMuted,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#242424",
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: "70%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2E2E2E",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  modalRowText: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  modalRowTextSelected: {
    color: COLORS.gold,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 32,
  },
});
