import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  RefreshControl,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import { showError } from "../../utils/toast";
import Skeleton from "../Skeleton";
import EmptyState from "../EmptyState";
import PaginationControls from "../PaginationControls";

const PAGE_SIZE = 10;

export interface DirectoryColumn<T> {
  label: string;
  flex: number;
  render: (item: T) => ReactNode;
}

interface DirectoryScreenProps<T> {
  title: string;
  /** Singular / plural noun for counts, e.g. ["staff member", "staff members"]. */
  noun: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  actionLabel: string;
  actionIcon: keyof typeof Ionicons.glyphMap;
  onAction: () => void;
  load: () => Promise<T[]>;
  getKey: (item: T) => string;
  isActive: (item: T) => boolean;
  searchFields: (item: T) => (string | null | undefined)[];
  searchPlaceholder: string;
  columns: DirectoryColumn<T>[];
  /** Mobile card body (left side). The Active/Inactive pill is added for you. */
  renderCard: (item: T) => ReactNode;
  onOpen: (item: T) => void;
}

/** Small tinted Active / Inactive pill, same look as the attendance status pills. */
export function ActivePill({ active }: { active: boolean }) {
  const fg = active ? COLORS.success : COLORS.textSecondary;
  return (
    <View style={[pill.pill, { backgroundColor: `${fg}38` }]}>
      <View style={[pill.dot, { backgroundColor: fg }]} />
      <Text style={[pill.text, { color: fg }]}>{active ? "Active" : "Inactive"}</Text>
    </View>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length === 0 ? "?" : (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  return (
    <View style={[pill.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[pill.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

// One consistent list screen (header, search, zebra table, pagination, deactivated group)
// shared by Staff, Clients and Sites so they look like the dashboard.
export default function DirectoryScreen<T>(props: DirectoryScreenProps<T>) {
  const {
    title, noun, icon, actionLabel, actionIcon, onAction, load, getKey, isActive,
    searchFields, searchPlaceholder, columns, renderCard, onOpen,
  } = props;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showInactive, setShowInactive] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setItems(await load());
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const active = useMemo(() => items.filter(isActive), [items, isActive]);
  const inactive = useMemo(() => items.filter((i) => !isActive(i)), [items, isActive]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return active;
    return active.filter((i) => searchFields(i).some((f) => f?.toLowerCase().includes(q)));
  }, [active, search, searchFields]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
    setVisible(PAGE_SIZE);
  };

  if (loading) {
    return (
      <View style={[styles.screen, { padding: isDesktop ? 32 : 16 }]}>
        <Skeleton width={180} height={24} style={{ marginBottom: 8 }} />
        <Skeleton width={120} height={13} style={{ marginBottom: 28 }} />
        <Skeleton height={42} radius={RADIUS.md} style={{ marginBottom: 16 }} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={isDesktop ? 44 : 64} radius={RADIUS.md} style={{ marginBottom: 8 }} />
        ))}
      </View>
    );
  }

  const count = (n: number) => `${n} ${n === 1 ? noun[0] : noun[1]}`;

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {count(active.length)} active{inactive.length > 0 ? ` · ${inactive.length} inactive` : ""}
        </Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.chip} onPress={onRefresh} accessibilityLabel="Refresh list">
          <Ionicons name="refresh" size={14} color={COLORS.gold} />
          <Text style={styles.chipText}>{refreshing ? "Refreshing…" : "Refresh"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primary} onPress={onAction}>
          <Ionicons name={actionIcon} size={16} color="#1A1A1A" />
          <Text style={styles.primaryText}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const searchBox = (
    <View style={styles.searchBox}>
      <Ionicons name="search" size={16} color={COLORS.textMuted} />
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={onSearch}
        placeholder={searchPlaceholder}
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {search ? (
        <TouchableOpacity onPress={() => onSearch("")} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const empty = search.trim() ? (
    <EmptyState
      icon="search-outline"
      title={`No ${noun[1]} match "${search.trim()}"`}
      hint="Check the spelling or try a shorter search."
      actionLabel="Clear search"
      onAction={() => onSearch("")}
    />
  ) : (
    <EmptyState
      icon={icon}
      title={items.length === 0 ? `No ${noun[1]} yet` : `No active ${noun[1]}`}
      hint={items.length === 0 ? `Use “${actionLabel}” to add the first one.` : "Everyone here is deactivated."}
    />
  );

  const tableHeader = (
    <View style={styles.tableHeaderRow}>
      {columns.map((c) => (
        <Text key={c.label} style={[styles.th, { flex: c.flex }]}>
          {c.label}
        </Text>
      ))}
    </View>
  );

  const renderRows = (rows: T[], dim: boolean) =>
    rows.map((item, i) => (
      <DirectoryRow key={getKey(item)} index={i} dim={dim} onPress={() => onOpen(item)}>
        {columns.map((c) => (
          <View key={c.label} style={{ flex: c.flex, paddingRight: 8 }}>
            {c.render(item)}
          </View>
        ))}
      </DirectoryRow>
    ));

  const renderCards = (rows: T[], dim: boolean) =>
    rows.map((item) => (
      <Pressable key={getKey(item)} onPress={() => onOpen(item)} style={[styles.cardItem, dim && styles.dim]}>
        <View style={{ flex: 1, paddingRight: 8 }}>{renderCard(item)}</View>
        <ActivePill active={!dim} />
      </Pressable>
    ));

  const inactiveSection =
    inactive.length > 0 ? (
      <View style={{ marginTop: 20 }}>
        <TouchableOpacity style={styles.accordion} onPress={() => setShowInactive((v) => !v)}>
          <Text style={styles.accordionText}>Deactivated ({inactive.length})</Text>
          <Ionicons name={showInactive ? "chevron-up" : "chevron-down"} size={18} color={COLORS.gold} />
        </TouchableOpacity>
        {showInactive && (
          <View style={{ marginTop: 10 }}>
            {isDesktop ? (
              <View style={styles.table}>
                {tableHeader}
                {renderRows(inactive, true)}
              </View>
            ) : (
              renderCards(inactive, true)
            )}
          </View>
        )}
      </View>
    ) : null;

  if (isDesktop) {
    return (
      <LinearGradient colors={[COLORS.surface, COLORS.surface]} style={styles.desktopScreen}>
        <View style={styles.desktopCard}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.webContent}>
            <View style={styles.maxWidthWrap}>
              {header}
              {searchBox}
              {filtered.length === 0 ? (
                empty
              ) : (
                <View style={styles.table}>
                  {tableHeader}
                  {renderRows(pageRows, false)}
                </View>
              )}
              {filtered.length > PAGE_SIZE && (
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  total={filtered.length}
                  limit={PAGE_SIZE}
                  onPageChange={setPage}
                />
              )}
              {inactiveSection}
            </View>
          </ScrollView>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.mobileContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
        }
      >
        {header}
        {searchBox}
        {filtered.length === 0 ? empty : renderCards(filtered.slice(0, visible), false)}
        {filtered.length > visible && (
          <TouchableOpacity style={styles.showMore} onPress={() => setVisible((v) => v + PAGE_SIZE)}>
            <Text style={styles.showMoreText}>Show more ({filtered.length - visible} remaining)</Text>
          </TouchableOpacity>
        )}
        {inactiveSection}
      </ScrollView>
    </View>
  );
}

function DirectoryRow({
  index,
  dim,
  onPress,
  children,
}: {
  index: number;
  dim: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.row,
        index % 2 === 1 && styles.rowStriped,
        hovered && styles.rowHovered,
        dim && styles.dim,
      ]}
    >
      {children}
    </Pressable>
  );
}

const pill = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.full,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
  avatar: { backgroundColor: COLORS.goldTint, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.gold, fontWeight: "700" },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "700" },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...SHADOW.card,
  },
  chipText: { color: COLORS.textSecondary, fontSize: 12 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  primaryText: { color: "#1A1A1A", fontSize: 13, fontWeight: "700" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 16,
    ...SHADOW.card,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14, outlineStyle: "none" } as any,

  table: {
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    ...SHADOW.card,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  th: { color: COLORS.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  rowStriped: { backgroundColor: COLORS.zebra },
  rowHovered: { backgroundColor: COLORS.hover, cursor: "pointer" } as any,
  dim: { opacity: 0.65 },

  cardItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    ...SHADOW.card,
  },
  accordion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...SHADOW.card,
  },
  accordionText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: "600" },
  showMore: {
    alignSelf: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 4,
    ...SHADOW.card,
  },
  showMoreText: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },

  desktopScreen: { flex: 1 },
  desktopCard: { flex: 1, margin: 24, elevation: 8 },
  webContent: { padding: 32, width: "100%" },
  maxWidthWrap: { width: "100%", maxWidth: 1200, alignSelf: "center" },
  mobileContent: { padding: 16, paddingBottom: 32 },
});

// Shared text styles for cell content.
export const cell = StyleSheet.create({
  primary: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "500" },
  secondary: { color: COLORS.textSecondary, fontSize: 13 },
  muted: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "600" },
  cardLine: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
});
