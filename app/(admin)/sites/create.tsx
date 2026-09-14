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
  const [clientsError, setClientsError] = useState<string>("");
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchClients = async () => {
      setClientsError("");
      try {
        const data = await getAllClients();
        setClients(data.filter((client) => client.is_active));
      } catch (err: any) {
        setClientsError(err.message);
      } finally {
        setClientsLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleSelectClient = (client: Client) => {
    setClientId(client.id);
    setSelectedClient(client);
    setPickerVisible(false);
  };

  const handleSubmit = async () => {
    setError("");

    if (!name.trim() || !address.trim() || !latitude.trim() || !longitude.trim() || !clientId) {
      setError("Name, address, latitude, longitude, and client are all required");
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setError("Latitude must be a number between -90 and 90");
      return;
    }

    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setError("Longitude must be a number between -180 and 180");
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
      router.back();
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const clientDisplayLabel = (client: Client): string =>
    client.company_name ? `${client.full_name} (${client.company_name})` : client.full_name;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton onPress={() => router.back()} />

      <Text style={styles.title}>Add Site</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} editable={!submitting} />

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        editable={!submitting}
      />

      <Text style={styles.label}>Latitude</Text>
      <TextInput
        style={styles.input}
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="numbers-and-punctuation"
        editable={!submitting}
      />

      <Text style={styles.label}>Longitude</Text>
      <TextInput
        style={styles.input}
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="numbers-and-punctuation"
        editable={!submitting}
      />

      <Text style={styles.label}>Client</Text>
      {clientsLoading ? (
        <ActivityIndicator style={styles.clientLoading} />
      ) : clientsError ? (
        <Text style={styles.errorText}>{clientsError}</Text>
      ) : (
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setPickerVisible(true)}
          disabled={submitting}
        >
          <Text style={selectedClient ? styles.dropdownText : styles.dropdownPlaceholder}>
            {selectedClient ? clientDisplayLabel(selectedClient) : "Select a client"}
          </Text>
          <Ionicons name="chevron-down-outline" size={18} color="#666" />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Create Site</Text>
        )}
      </TouchableOpacity>

      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close-outline" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={clients}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.emptyText}>No active clients found.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => handleSelectClient(item)}
                >
                  <Text style={styles.modalRowText}>{clientDisplayLabel(item)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  clientLoading: {
    marginTop: 8,
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  dropdownText: {
    fontSize: 14,
    color: "#000",
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: "#999",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    fontSize: 18,
    fontWeight: "bold",
  },
  modalRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalRowText: {
    fontSize: 15,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 32,
  },
});
