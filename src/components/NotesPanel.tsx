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
import {
  getStaffSiteNotes,
  addStaffNote,
  getClientSiteNotes,
  addClientNote,
  SiteNote,
} from "../services/notes.service";
import { showSuccess, showError } from "../utils/toast";
import { formatDateTime } from "../utils/datetime";
import { COLORS, RADIUS } from "../constants/theme";

interface NotesPanelProps {
  siteId: string | null;
  active?: boolean;
  role?: "staff" | "client";
}

const NOTES_API = {
  staff: { getNotes: getStaffSiteNotes, addNote: addStaffNote },
  client: { getNotes: getClientSiteNotes, addNote: addClientNote },
};

export default function NotesPanel({ siteId, active = true, role = "staff" }: NotesPanelProps) {
  const { getNotes, addNote } = NOTES_API[role];
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
      const data = await getNotes(siteId);
      setNotes(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [siteId, getNotes]);

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
      const note = await addNote(siteId, noteText.trim());
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
          <ActivityIndicator size="large" color={COLORS.gold} />
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
              placeholderTextColor={COLORS.textMuted}
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
                <ActivityIndicator color="#1A1A1A" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#1A1A1A" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addNoteButton} onPress={() => setComposing(true)}>
            <Ionicons name="add" size={18} color="#1A1A1A" />
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
        <Text style={[styles.badgeText, isClient ? styles.badgeTextClient : styles.badgeTextStaff]}>
          {isClient ? "CLIENT" : "STAFF"}
        </Text>
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
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 32,
  },
  card: {
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
  },
  cardStaff: {
    backgroundColor: COLORS.surface,
  },
  cardClient: {
    backgroundColor: "#2A2310",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  badgeTextStaff: {
    color: COLORS.textSecondary,
  },
  badgeTextClient: {
    color: COLORS.gold,
  },
  authorName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  composeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  composeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textPrimary,
    maxHeight: 100,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  sendButton: {
    backgroundColor: COLORS.gold,
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
  },
  addNoteButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.gold,
    padding: 14,
    borderRadius: RADIUS.md,
  },
  addNoteButtonText: {
    color: "#1A1A1A",
    fontWeight: "bold",
  },
});
