import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import NotesPanel from "./NotesPanel";

interface NotesModalProps {
  visible: boolean;
  siteId: string | null;
  onClose: () => void;
}

export default function NotesModal({ visible, siteId, onClose }: NotesModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Site Notes</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <NotesPanel siteId={siteId} active={visible} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  doneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});
