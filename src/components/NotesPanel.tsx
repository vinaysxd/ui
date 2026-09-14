import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getStaffSiteNotes, addStaffNote, SiteNote } from "../services/notes.service";
import { showSuccess, showError } from "../utils/toast";
import { formatDateTime } from "../utils/datetime";

interface NotesPanelProps {
  siteId: string | null;
  active?: boolean;
}

export default function NotesPanel({ siteId, active = true }: NotesPanelProps) {
  const [notes, setNotes] = useState<SiteNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [composing, setComposing] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchNotes = useCallback(async () => {
    if (!siteId) {
      setNotes([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await getStaffSiteNotes(siteId);
      setNotes(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (active) {
      setLoading(true);
      setComposing(false);
      setNoteText("");
      fetchNotes();
    }
  }, [active, fetchNotes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotes();
  };

  const handleSubmitNote = async () => {
    if (!siteId) {
      showError("No site selected");
      return;
    }
    if (!noteText.trim()) {
      showError("Note cannot be empty");
      return;
    }
    setSubmitting(true);
    try {
      const note = await addStaffNote(siteId, noteText.trim());
      setNotes((prev) => [note, ...prev]);
      setNoteText("");
      setComposing(false);
      showSuccess("Note added");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No notes yet</Text>}
          renderItem={({ item }) => <NoteCard note={item} />}
        />
      )}

      <View style={styles.footer}>
        {composing ? (
          <View style={styles.composeRow}>
            <TextInput
              style={styles.composeInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Write a note..."
              multiline
              autoFocus
              editable={!submitting}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setComposing(false);
                setNoteText("");
              }}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendButton} onPress={handleSubmitNote} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addNoteButton} onPress={() => setComposing(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addNoteButtonText}>Add note</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function NoteCard({ note }: { note: SiteNote }) {
  const isClient = note.type === "client";
  return (
    <View style={[styles.card, isClient ? styles.cardClient : styles.cardStaff]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, isClient ? styles.badgeClient : styles.badgeStaff]}>
          <Text style={styles.badgeText}>{isClient ? "Client" : "Staff"}</Text>
        </View>
        <Text style={styles.authorName} numberOfLines={1}>
          {note.author?.full_name ?? "Unknown"}
        </Text>
      </View>
      <Text style={styles.noteText}>{note.note}</Text>
      <Text style={styles.timeText}>{formatDateTime(note.created_at)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 32,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardStaff: {
    backgroundColor: "#e5e5e5",
  },
  cardClient: {
    backgroundColor: "#dbeafe",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeStaff: {
    backgroundColor: "#2563eb",
  },
  badgeClient: {
    backgroundColor: "#7c3aed",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  authorName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    flexShrink: 1,
  },
  noteText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: "#666",
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  composeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  composeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    maxHeight: 100,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  sendButton: {
    backgroundColor: "#000",
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addNoteButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 8,
  },
  addNoteButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
