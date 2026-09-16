import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import NotesPanel from "./NotesPanel";
import { COLORS } from "../constants/theme";

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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  doneText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gold,
  },
});
