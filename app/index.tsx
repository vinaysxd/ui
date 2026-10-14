import { View, StyleSheet } from 'react-native';
import Loader from "../src/components/Loader";

export default function Index() {
  return (
    <View style={styles.container}>
      <Loader size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
