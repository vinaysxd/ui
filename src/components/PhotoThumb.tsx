import { useEffect, useState } from "react";
import { View, Image, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSignedPhotoUrl } from "../services/attendance.service";

interface PhotoThumbProps {
  path: string | null;
}

export default function PhotoThumb({ path }: PhotoThumbProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setSignedUrl(null);
    setFailed(false);
    setLoading(true);

    getSignedPhotoUrl(path)
      .then((url) => {
        if (!cancelled) {
          setSignedUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (loading) {
    return (
      <View style={styles.thumbPlaceholder}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  if (!signedUrl || failed) {
    return (
      <View style={styles.thumbPlaceholder}>
        <Ionicons name="image-outline" size={24} color="#999" />
      </View>
    );
  }

  return (
    <Image source={{ uri: signedUrl }} style={styles.thumb} onError={() => setFailed(true)} />
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#eee",
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
  },
  thumbPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#eee",
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
});
