import { View, Text, StyleSheet } from "react-native";

export default function SitesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sites</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
