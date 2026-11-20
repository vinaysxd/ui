import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import { SiteNote } from "../../services/notes.service";
import { daysAgo, formatTime } from "../../utils/datetime";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GROUP_GAP_MS = 5 * 60 * 1000;

const dayLabel = (iso: string): string => {
  const diff = daysAgo(iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

interface ChatMessagesProps {
  notes: SiteNote[];
  /** "author": your own messages sit on the right. "type": client messages sit on the right (admin view). */
  alignBy: "author" | "type";
  currentUserId?: string | null;
  canDelete?: (note: SiteNote) => boolean;
  onDelete?: (note: SiteNote) => void;
}

// Chronological (oldest -> newest) chat thread with day separators and grouped bubbles.
export default function ChatMessages({ notes, alignBy, currentUserId, canDelete, onDelete }: ChatMessagesProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const ordered = [...notes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <View>
      {ordered.map((note, i) => {
        const prev = ordered[i - 1];
        const next = ordered[i + 1];
        const newDay = !prev || daysAgo(prev.created_at) !== daysAgo(note.created_at);
        const sameRunAsPrev =
          !!prev &&
          !newDay &&
          prev.author_id === note.author_id &&
          new Date(note.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_GAP_MS;
        const sameRunAsNext =
          !!next &&
          next.author_id === note.author_id &&
          daysAgo(next.created_at) === daysAgo(note.created_at) &&
          new Date(next.created_at).getTime() - new Date(note.created_at).getTime() < GROUP_GAP_MS;

        const own = alignBy === "author" ? note.author_id === currentUserId : false;
        const right = alignBy === "author" ? own : note.type === "client";
        const isClient = note.type === "client";
        const name = note.author?.full_name ?? "Unknown";
        const deletable = !!canDelete?.(note) && !!onDelete;
        const showActions = deletable && activeId === note.id;

        return (
          <View key={note.id}>
            {newDay && (
              <View style={styles.dayWrap}>
                <Text style={styles.dayText}>{dayLabel(note.created_at)}</Text>
              </View>
            )}
            <View
              style={[
                styles.row,
                right ? styles.rowRight : styles.rowLeft,
                { marginTop: sameRunAsPrev ? 2 : 12 },
              ]}
            >
              {!right && (
                <View style={styles.avatarSlot}>
                  {!sameRunAsNext && (
                    <View style={[styles.avatar, isClient && styles.avatarClient]}>
                      <Text style={[styles.avatarText, isClient && styles.avatarTextClient]}>{initialsOf(name)}</Text>
                    </View>
                  )}
                </View>
              )}
              <View style={[styles.col, right ? styles.colRight : styles.colLeft]}>
                {!sameRunAsPrev && !own && (
                  <View style={styles.senderRow}>
                    <Text style={styles.sender} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[styles.role, isClient && styles.roleClient]}>
                      {note.author?.role === "admin" ? "ADMIN" : isClient ? "CLIENT" : "STAFF"}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  activeOpacity={deletable ? 0.8 : 1}
                  onPress={() => deletable && setActiveId(showActions ? null : note.id)}
                  style={[
                    styles.bubble,
                    own ? styles.bubbleOwn : right ? styles.bubbleClient : styles.bubbleOther,
                    right ? styles.cornerRight : styles.cornerLeft,
                  ]}
                >
                  <Text style={[styles.message, own && styles.messageOwn]} selectable>
                    {note.note}
                  </Text>
                  <Text style={[styles.time, own && styles.timeOwn]}>{formatTime(note.created_at)}</Text>
                </TouchableOpacity>
                {showActions && (
                  <TouchableOpacity onPress={() => onDelete!(note)} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>Delete message</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dayWrap: { alignItems: "center", marginTop: 18, marginBottom: 4 },
  dayText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    backgroundColor: COLORS.hover,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },
  col: { maxWidth: "78%", flexShrink: 1 },
  colLeft: { alignItems: "flex-start" },
  colRight: { alignItems: "flex-end" },
  avatarSlot: { width: 30 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.hover,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarClient: { backgroundColor: COLORS.goldTint },
  avatarText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "700" },
  avatarTextClient: { color: COLORS.gold },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, marginLeft: 4 },
  sender: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600", flexShrink: 1 },
  role: { color: COLORS.textMuted, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  roleClient: { color: COLORS.gold },
  bubble: {
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 13,
    ...SHADOW.card,
    shadowRadius: 4,
    elevation: 0,
  },
  bubbleOwn: { backgroundColor: COLORS.gold },
  bubbleClient: { backgroundColor: COLORS.accentBg },
  bubbleOther: { backgroundColor: COLORS.cardHigh },
  cornerLeft: { borderBottomLeftRadius: 5 },
  cornerRight: { borderBottomRightRadius: 5 },
  message: { color: COLORS.textPrimary, fontSize: 14.5, lineHeight: 20 },
  messageOwn: { color: "#1A1A1A" },
  time: { color: COLORS.textMuted, fontSize: 10.5, marginTop: 3, alignSelf: "flex-end" },
  timeOwn: { color: "rgba(26,26,26,0.6)" },
  deleteBtn: { marginTop: 4, paddingVertical: 2, paddingHorizontal: 6 },
  deleteText: { color: COLORS.dangerText, fontSize: 12, fontWeight: "600" },
});
