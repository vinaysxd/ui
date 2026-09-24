import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  page,
  totalPages,
  total,
  limit,
  disabled = false,
  onPageChange,
}: PaginationControlsProps) {
  if (total === 0) return null;

  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  const prevDisabled = disabled || page <= 1;
  const nextDisabled = disabled || page >= totalPages;

  return (
    <View>
      <Text style={styles.totalText}>
        Showing {first}-{last} of {total} records
      </Text>
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.button, prevDisabled && styles.buttonDisabled]}
          onPress={() => onPageChange(page - 1)}
          disabled={prevDisabled}
        >
          <Text style={styles.buttonText}>← Previous</Text>
        </TouchableOpacity>
        <Text style={styles.pageText}>
          Page {page} of {totalPages}
        </Text>
        <TouchableOpacity
          style={[styles.button, nextDisabled && styles.buttonDisabled]}
          onPress={() => onPageChange(page + 1)}
          disabled={nextDisabled}
        >
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  totalText: {
    color: "#666666",
    fontSize: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  button: {
    backgroundColor: "#242424",
    borderRadius: RADIUS.md,
    padding: 10,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "600",
  },
  pageText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
});
