import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Pressable,
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
  deleteNote,
  SiteNote,
} from "../services/notes.service";
import { getUser } from "../store/auth";
import { showSuccess, showError } from "../utils/toast";
import { formatDateTime } from "../utils/datetime";
import { COLORS, RADIUS } from "../constants/theme";
import ConfirmModal from "./ConfirmModal";

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [noteText, setNoteText] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [deleteModalLoading, setDeleteModalLoading] = useState<boolean>(false);

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
      setNoteText("");
      fetchNotes();
    }
  }, [active, fetchNotes]);

  useEffect(() => {
    getUser().then((user) => setCurrentUserId(user?.id ?? null));
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotes();
  };

  const openDeleteModal = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setNoteToDelete(null);
  };

  const performDeleteNote = async () => {
    if (!siteId || !noteToDelete) {
      return;
    }
    setDeleteModalLoading(true);
    try {
      await deleteNote(siteId, noteToDelete);
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete));
      setDeleteModalVisible(false);
      setNoteToDelete(null);
      showSuccess("Note deleted");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDeleteModalLoading(false);
    }
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
        <FlatList keyboardShouldPersistTaps="handled"
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No notes yet</Text>}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              canDelete={currentUserId != null && item.author_id === currentUserId}
              onDelete={() => openDeleteModal(item.id)}
            />
          )}
        />
      )}

      <View style={styles.footer}>
        <View style={styles.composeRow}>
          <TextInput
            style={styles.composeInput}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Write a note..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            editable={!submitting}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (submitting || !noteText.trim()) && styles.sendButtonDisabled,
            ]}
            onPress={handleSubmitNote}
            disabled={submitting || !noteText.trim()}
          >
            {submitting ? (
              <ActivityIndicator color="#1A1A1A" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#1A1A1A" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        confirmText="Delete"
        confirmStyle="destructive"
        loading={deleteModalLoading}
        onConfirm={performDeleteNote}
        onCancel={closeDeleteModal}
      />
    </KeyboardAvoidingView>
  );
}

function NoteCard({
  note,
  canDelete,
  onDelete,
}: {
  note: SiteNote;
  canDelete: boolean;
  onDelete: () => void;
}) {
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
        {canDelete && (
          <Pressable
            onPress={onDelete}
            {...(Platform.OS === "web" ? { onClick: onDelete } : {})}
            style={styles.deleteNoteButton}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          </Pressable>
        )}
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
  deleteNoteButton: {
    marginLeft: "auto",
    padding: 2,
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
    alignItems: "center",
    gap: 8,
  },
  composeInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 0,
    textAlignVertical: "center",
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textPrimary,
  },
  sendButton: {
    backgroundColor: COLORS.gold,
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
