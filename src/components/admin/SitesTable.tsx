import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import { Site } from "../../services/sites.service";

interface SitesTableProps {
  sites: Site[];
  /** Adds an Active / Inactive column. */
  showStatus?: boolean;
}

// Plain, read-only table of sites (no navigation).
export default function SitesTable({ sites, showStatus = false }: SitesTableProps) {
  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Text style={[styles.th, { flex: 2 }]}>Site</Text>
        <Text style={[styles.th, { flex: 3 }]}>Address</Text>
        {showStatus && <Text style={[styles.th, { flex: 1.2 }]}>Status</Text>}
      </View>
      {sites.map((site, i) => (
        <View key={site.id} style={[styles.row, i % 2 === 1 && styles.rowStriped]}>
          <Text style={[styles.name, { flex: 2 }]}>{site.name}</Text>
          <Text style={[styles.address, { flex: 3 }]}>{site.address || "—"}</Text>
          {showStatus && (
            <View style={{ flex: 1.2 }}>
              <View style={[styles.pill, { backgroundColor: `${site.is_active ? COLORS.success : COLORS.dangerText}38` }]}>
                <View style={[styles.dot, { backgroundColor: site.is_active ? COLORS.success : COLORS.dangerText }]} />
                <Text style={[styles.pillText, { color: site.is_active ? COLORS.success : COLORS.dangerText }]}>
                  {site.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    ...SHADOW.card,
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  th: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowStriped: { backgroundColor: COLORS.zebra },
  name: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "500", paddingRight: 12 },
  address: { color: COLORS.textSecondary, fontSize: 13, paddingRight: 12 },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: "700" },
});
