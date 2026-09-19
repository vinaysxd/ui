import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";

// Full-screen blocker shown while a clock in / clock out request is in flight.
export default function ProcessingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={COLORS.gold} />
      <Text style={styles.text}>Processing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    elevation: 100,
  },
  text: {
    color: "#FFFFFF",
    marginTop: 12,
    fontSize: 14,
  },
});
