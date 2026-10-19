import { useState } from "react";
import {
  View,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  ImageStyle,
  StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Loader from "./Loader";

interface ImageViewerModalProps {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

export default function ImageViewerModal({ visible, uri, onClose }: ImageViewerModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      onShow={() => {
        setLoading(true);
        setFailed(false);
      }}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      <Pressable style={styles.backdrop} onPress={onClose}>
        {uri && !failed ? (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setFailed(true);
              setLoading(false);
            }}
          />
        ) : (
          <Ionicons name="image-outline" size={56} color="#9CA3AF" />
        )}
        {loading && uri && !failed ? (
          <View style={styles.loader} pointerEvents="none">
            <Loader size="large" />
          </View>
        ) : null}
      </Pressable>
      <Pressable
        style={styles.closeButton}
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close image"
      >
        <Ionicons name="close" size={26} color="#FFFFFF" />
      </Pressable>
    </Modal>
  );
}

interface PressableImageProps {
  uri: string;
  style: StyleProp<ImageStyle>;
  onError?: () => void;
}

/** Image that opens fullscreen in ImageViewerModal when tapped. */
export function PressableImage({ uri, style, onError }: PressableImageProps) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="imagebutton">
        <Image source={{ uri }} style={style} onError={onError} />
      </Pressable>
      <ImageViewerModal visible={open} uri={uri} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loader: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
});
