import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
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
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW } from "../constants/theme";
import ConfirmModal from "./ConfirmModal";
import Loader from "./Loader";
import EmptyState from "./EmptyState";
import ChatMessages from "./chat/ChatMessages";
import ChatComposer from "./chat/ChatComposer";

interface NotesPanelProps {
  siteId: string | null;
  active?: boolean;
  role?: "staff" | "client";
}

const NOTES_API = {
  staff: { getNotes: getStaffSiteNotes, addNote: addStaffNote },
  client: { getNotes: getClientSiteNotes, addNote: addClientNote },
};

// Site notes presented as a chat: your messages on the right, everyone else's on the left.
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

  const scrollRef = useRef<ScrollView>(null);

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
      showSuccess("Message deleted");
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
      return;
    }
    setSubmitting(true);
    try {
      const note = await addNote(siteId, noteText.trim());
      setNotes((prev) => [note, ...prev]);
      setNoteText("");
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
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.refreshBtn, (loading || refreshing) && { opacity: 0.6 }]}
          onPress={onRefresh}
          disabled={loading || refreshing}
          accessibilityLabel="Refresh messages"
        >
          <Ionicons name="refresh" size={14} color={COLORS.gold} />
          <Text style={styles.refreshText}>{refreshing ? "Refreshing…" : "Refresh"}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <Loader size="large" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          // Keep the newest message in view on load and after sending.
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
        >
          {notes.length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="No messages yet"
              hint="Start the conversation below. Staff and the client can both see it."
            />
          ) : (
            <ChatMessages
              notes={notes}
              alignBy="author"
              currentUserId={currentUserId}
              canDelete={(n) => currentUserId != null && n.author_id === currentUserId}
              onDelete={(n) => {
                setNoteToDelete(n.id);
                setDeleteModalVisible(true);
              }}
            />
          )}
        </ScrollView>
      )}

      <ChatComposer
        value={noteText}
        onChangeText={setNoteText}
        onSend={handleSubmitNote}
        sending={submitting}
        placeholder="Type a message…"
      />

      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete Message"
        message="Are you sure you want to delete this message?"
        confirmText="Delete"
        confirmStyle="destructive"
        loading={deleteModalLoading}
        onConfirm={performDeleteNote}
        onCancel={closeDeleteModal}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
    ...SHADOW.card,
  },
  refreshText: { color: COLORS.gold, fontSize: 12, fontWeight: "600" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
    justifyContent: "flex-end",
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
  },
});
