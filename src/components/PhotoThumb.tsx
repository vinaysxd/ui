import { useEffect, useState } from "react";
import { View, Image, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSignedPhotoUrl } from "../services/attendance.service";
import { COLORS, RADIUS } from "../constants/theme";

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
        <ActivityIndicator size="small" color={COLORS.textMuted} />
      </View>
    );
  }

  if (!signedUrl || failed) {
    return (
      <View style={styles.thumbPlaceholder}>
        <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
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
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
});
