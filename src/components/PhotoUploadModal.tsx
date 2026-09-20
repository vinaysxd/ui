import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImageSourceSheet from "./ImageSourceSheet";
import {
  getAttendancePhotos,
  uploadBeforePhoto,
  uploadAfterPhoto,
  AttendancePhoto,
} from "../services/attendance.service";
import { showSuccess, showError } from "../utils/toast";
import PhotoThumb from "./PhotoThumb";
import { COLORS, RADIUS } from "../constants/theme";
import { LOADING_STYLE } from "../constants/ui";

interface PhotoUploadModalProps {
  visible: boolean;
  attendanceId: string | null;
  siteName?: string;
  onClose: () => void;
}

export default function PhotoUploadModal({
  visible,
  attendanceId,
  siteName,
  onClose,
}: PhotoUploadModalProps) {
  const [photos, setPhotos] = useState<AttendancePhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [addingPair, setAddingPair] = useState<boolean>(false);
  const [newLabel, setNewLabel] = useState<string>("");
  const [uploadingBefore, setUploadingBefore] = useState<boolean>(false);
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);
  const pickTarget = useRef<{ type: "before" } | { type: "after"; photoId: string } | null>(null);
  const [uploadingAfterId, setUploadingAfterId] = useState<string>("");

  const fetchPhotos = useCallback(async () => {
    if (!attendanceId) {
      setPhotos([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await getAttendancePhotos(attendanceId);
      setPhotos(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [attendanceId]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setAddingPair(false);
      setNewLabel("");
      fetchPhotos();
    }
  }, [visible, fetchPhotos]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPhotos();
  };

  const handleCancelAddPair = () => {
    setAddingPair(false);
    setNewLabel("");
  };

  const handlePickBeforePhoto = async () => {
    if (!attendanceId) {
      showError("No active attendance to attach photos to");
      return;
    }
    if (!newLabel.trim()) {
      showError("Enter a label for this photo pair");
      return;
    }

    pickTarget.current = { type: "before" };
    setSheetVisible(true);
  };

  const uploadBefore = async (uri: string) => {
    console.log("uploadBefore called:", { attendanceId, label: newLabel.trim(), uri });
    if (!attendanceId) {
      console.log("Upload aborted: attendanceId is missing");
      return;
    }
    setUploadingBefore(true);
    try {
      await uploadBeforePhoto(attendanceId, newLabel.trim(), uri);
      showSuccess("Before photo uploaded");
      setAddingPair(false);
      setNewLabel("");
      await fetchPhotos();
    } catch (err: any) {
      console.log("Upload error (modal):", err);
      showError(err.message);
    } finally {
      setUploadingBefore(false);
    }
  };

  const handleUploadAfter = (photoId: string) => {
    pickTarget.current = { type: "after", photoId };
    setSheetVisible(true);
  };

  const uploadAfter = async (photoId: string, uri: string) => {
    setUploadingAfterId(photoId);
    try {
      await uploadAfterPhoto(photoId, uri);
      showSuccess("After photo uploaded");
      await fetchPhotos();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUploadingAfterId("");
    }
  };

  const handlePicked = (uri: string) => {
    const target = pickTarget.current;
    pickTarget.current = null;
    console.log("handlePicked:", { uri, target });
    if (!target) {
      console.log("Upload aborted: no pick target");
      return;
    }
    if (target.type === "before") uploadBefore(uri);
    else uploadAfter(target.photoId, uri);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {siteName ? `${siteName} Photos` : "Photos"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.gold} />
          </View>
        ) : (
          <FlatList keyboardShouldPersistTaps="handled"
            data={photos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<Text style={styles.emptyText}>No photo pairs yet.</Text>}
            renderItem={({ item }) => (
              <PhotoPairCard
                photo={item}
                uploadingAfter={uploadingAfterId === item.id}
                onUploadAfter={() => handleUploadAfter(item.id)}
              />
            )}
            ListFooterComponent={
              <View style={styles.footer}>
                {addingPair ? (
                  <View style={styles.addPairForm}>
                    <TextInput
                      style={styles.input}
                      value={newLabel}
                      onChangeText={setNewLabel}
                      placeholder='e.g. "Kitchen" or "Bathroom"'
                      placeholderTextColor={COLORS.textMuted}
                      autoFocus
                      editable={!uploadingBefore}
                    />
                    <View style={styles.addPairButtons}>
                      <TouchableOpacity
                        style={[styles.cancelButton, uploadingBefore && LOADING_STYLE]}
                        onPress={handleCancelAddPair}
                        disabled={uploadingBefore}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.choosePhotoButton, uploadingBefore && LOADING_STYLE]}
                        onPress={handlePickBeforePhoto}
                        disabled={uploadingBefore}
                      >
                        {uploadingBefore ? (
                          <ActivityIndicator color="#1A1A1A" size="small" />
                        ) : (
                          <Text style={styles.choosePhotoButtonText}>Choose Before Photo</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addPairButton}
                    onPress={() => setAddingPair(true)}
                  >
                    <Ionicons name="add" size={18} color="#1A1A1A" />
                    <Text style={styles.addPairButtonText}>Add new pair</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
        <ImageSourceSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onPicked={handlePicked}
        />
      </SafeAreaView>
    </Modal>
  );
}

function PhotoPairCard({
  photo,
  uploadingAfter,
  onUploadAfter,
}: {
  photo: AttendancePhoto;
  uploadingAfter: boolean;
  onUploadAfter: () => void;
}) {
  const paired = !!photo.before_photo_url && !!photo.after_photo_url;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>{photo.label}</Text>
        {paired ? <Ionicons name="checkmark-circle" size={20} color={COLORS.success} /> : null}
      </View>
      <View style={styles.thumbRow}>
        <View style={styles.thumbColumn}>
          <Text style={styles.thumbCaption}>Before</Text>
          <PhotoThumb path={photo.before_photo_url} />
        </View>

        <View style={styles.thumbColumn}>
          <Text style={styles.thumbCaption}>After</Text>
          {photo.after_photo_url ? (
            <PhotoThumb path={photo.after_photo_url} />
          ) : (
            <TouchableOpacity
              style={[styles.uploadAfterThumb, uploadingAfter && LOADING_STYLE]}
              onPress={onUploadAfter}
              disabled={uploadingAfter}
            >
              {uploadingAfter ? (
                <ActivityIndicator size="small" color={COLORS.textSecondary} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.uploadAfterThumbText}>Upload after</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  doneText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gold,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 12,
    overflow: "hidden",
  },
  goldBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gold,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  thumbRow: {
    flexDirection: "row",
    gap: 16,
  },
  thumbColumn: {
    alignItems: "flex-start",
  },
  thumbCaption: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  uploadAfterThumb: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  uploadAfterThumbText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  footer: {
    marginTop: 4,
  },
  addPairButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.gold,
    padding: 14,
    borderRadius: RADIUS.md,
  },
  addPairButtonText: {
    color: "#1A1A1A",
    fontWeight: "bold",
  },
  addPairForm: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  addPairButtons: {
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  choosePhotoButton: {
    flex: 2,
    backgroundColor: COLORS.gold,
    padding: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  choosePhotoButtonText: {
    color: "#1A1A1A",
    fontWeight: "bold",
  },
});
