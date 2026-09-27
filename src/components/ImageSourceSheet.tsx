import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS } from "../constants/theme";
import { showError } from "../utils/toast";

interface ImageSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  onPicked: (uri: string) => void;
  aspect?: [number, number];
  // When true, only the camera option is offered (e.g. attendance before/after
  // photos must be taken live, not picked from the gallery).
  cameraOnly?: boolean;
}

// Bottom sheet offering camera or gallery; calls onPicked with the chosen image uri.
export default function ImageSourceSheet({
  visible,
  onClose,
  onPicked,
  aspect = [4, 3],
  cameraOnly = false,
}: ImageSourceSheetProps) {
  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.8,
    allowsEditing: true,
    aspect,
    base64: false,
  };

  const launch = async (source: "camera" | "gallery") => {
    // Let the sheet finish dismissing first so the picker can present on iOS.
    onClose();
    await new Promise((resolve) => setTimeout(resolve, Platform.OS === "ios" ? 400 : 0));

    console.log("Image picker opened:", source);
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError("Permission to access the camera is required");
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError("Permission to access photos is required");
        return;
      }
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    console.log("Image selected:", result);
    if (result.canceled || result.assets.length === 0) {
      return;
    }
    console.log("Selected asset:", result.assets[0]);
    onPicked(result.assets[0].uri);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <Pressable onPress={() => {}}>
            <TouchableOpacity style={styles.option} onPress={() => launch("camera")}>
              <Ionicons name="camera-outline" size={22} color={COLORS.gold} />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>
            {!cameraOnly ? (
              <TouchableOpacity style={styles.option} onPress={() => launch("gallery")}>
                <Ionicons name="images-outline" size={22} color={COLORS.gold} />
                <Text style={styles.optionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#242424",
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#242424",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  optionText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: "600",
  },
  cancel: {
    backgroundColor: "#2E1A1A",
    borderRadius: RADIUS.md,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  cancelText: {
    color: "#E53935",
    fontSize: 16,
    fontWeight: "700",
  },
});
