import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImageSourceSheet from "./ImageSourceSheet";
import {
  getAttendancePhotos,
  uploadBeforePhoto,
  uploadAfterPhoto,
  getSignedPhotoUrl,
  AttendancePhoto,
} from "../services/attendance.service";
import { getSiteTasks, SiteTask } from "../services/tasks.service";
import { showSuccess, showError } from "../utils/toast";
import PhotoThumb from "./PhotoThumb";
import { COLORS, RADIUS } from "../constants/theme";
import { LOADING_STYLE } from "../constants/ui";

const FREEFORM_TAB = "Photos";

interface PhotoUploadModalProps {
  visible: boolean;
  attendanceId: string | null;
  siteId?: string | null;
  onClose: () => void;
}

export default function PhotoUploadModal({
  visible,
  attendanceId,
  siteId,
  onClose,
}: PhotoUploadModalProps) {
  const [photos, setPhotos] = useState<AttendancePhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(false);
  const [activeLabel, setActiveLabel] = useState<string>(FREEFORM_TAB);

  const [freeLabel, setFreeLabel] = useState<string>("");
  const [uploadingBefore, setUploadingBefore] = useState<boolean>(false);
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);
  const pickTarget = useRef<
    { type: "before"; label: string } | { type: "after"; photoId: string } | null
  >(null);
  const [uploadingAfterId, setUploadingAfterId] = useState<string>("");
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  const isFreeform = tasks.length === 0;
  const tabLabels = useMemo(
    () => (isFreeform ? [FREEFORM_TAB] : tasks.map((t) => t.label)),
    [isFreeform, tasks]
  );

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

  const fetchTasks = useCallback(async () => {
    if (!siteId) {
      setTasks([]);
      setTasksLoading(false);
      return;
    }
    setTasksLoading(true);
    try {
      const data = await getSiteTasks(siteId);
      setTasks(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setTasksLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setFreeLabel("");
      fetchPhotos();
      fetchTasks();
    }
  }, [visible, fetchPhotos, fetchTasks]);

  useEffect(() => {
    if (!tabLabels.includes(activeLabel)) {
      setActiveLabel(tabLabels[0] ?? FREEFORM_TAB);
    }
  }, [tabLabels, activeLabel]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPhotos();
  };

  const visiblePhotos = isFreeform ? photos : photos.filter((p) => p.label === activeLabel);

  const handleAddPhotoPair = () => {
    if (!attendanceId) {
      showError("No active attendance to attach photos to");
      return;
    }
    const label = isFreeform ? freeLabel.trim() : activeLabel;
    if (!label) {
      showError("Enter a label for this photo pair");
      return;
    }
    pickTarget.current = { type: "before", label };
    setSheetVisible(true);
  };

  const uploadBefore = async (label: string, uri: string) => {
    if (!attendanceId) {
      return;
    }
    setUploadingBefore(true);
    try {
      await uploadBeforePhoto(attendanceId, label, uri);
      showSuccess("Before photo uploaded");
      if (isFreeform) {
        setFreeLabel("");
      }
      await fetchPhotos();
    } catch (err: any) {
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
    if (!target) {
      return;
    }
    if (target.type === "before") {
      uploadBefore(target.label, uri);
    } else {
      uploadAfter(target.photoId, uri);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>PHOTOS</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
          >
            {tabLabels.map((label) => {
              const active = label === activeLabel;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveLabel(label)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading || tasksLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.gold} />
          </View>
        ) : (
          <FlatList keyboardShouldPersistTaps="handled"
            data={visiblePhotos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.gold}
                colors={[COLORS.gold]}
              />
            }
            ListEmptyComponent={<Text style={styles.emptyText}>No photo pairs yet.</Text>}
            renderItem={({ item }) => (
              <PhotoPairCard
                photo={item}
                uploadingAfter={uploadingAfterId === item.id}
                onUploadAfter={() => handleUploadAfter(item.id)}
                onViewBefore={() => setPreviewPath(item.before_photo_url)}
              />
            )}
            ListFooterComponent={
              <View style={styles.footer}>
                {isFreeform ? (
                  <TextInput
                    style={styles.input}
                    value={freeLabel}
                    onChangeText={setFreeLabel}
                    placeholder="Enter label e.g. Kitchen, Bathroom"
                    placeholderTextColor={COLORS.textMuted}
                    editable={!uploadingBefore}
                  />
                ) : null}
                <TouchableOpacity
                  style={[styles.addPairButton, uploadingBefore && LOADING_STYLE]}
                  onPress={handleAddPhotoPair}
                  disabled={uploadingBefore}
                >
                  {uploadingBefore ? (
                    <ActivityIndicator color={COLORS.gold} size="small" />
                  ) : (
                    <>
                      <Ionicons name="add" size={18} color={COLORS.gold} />
                      <Text style={styles.addPairButtonText}>Add Photo Pair</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            }
          />
        )}
        <ImageSourceSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onPicked={handlePicked}
          cameraOnly
        />
        <FullImagePreview
          path={previewPath}
          visible={!!previewPath}
          onClose={() => setPreviewPath(null)}
        />
      </SafeAreaView>
    </Modal>
  );
}

function PhotoPairCard({
  photo,
  uploadingAfter,
  onUploadAfter,
  onViewBefore,
}: {
  photo: AttendancePhoto;
  uploadingAfter: boolean;
  onUploadAfter: () => void;
  onViewBefore: () => void;
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
          <TouchableOpacity onPress={onViewBefore} disabled={!photo.before_photo_url}>
            <PhotoThumb path={photo.before_photo_url} />
          </TouchableOpacity>
        </View>

        <View style={styles.thumbColumn}>
          {photo.after_photo_url ? (
            <>
              <Text style={styles.thumbCaption}>After</Text>
              <PhotoThumb path={photo.after_photo_url} />
            </>
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
                  <Text style={styles.uploadAfterThumbText}>Upload After +</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function FullImagePreview({
  path,
  visible,
  onClose,
}: {
  path: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!visible || !path) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSignedPhotoUrl(path)
      .then((url) => {
        if (!cancelled) {
          setSignedUrl(url);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          showError(err.message);
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
  }, [visible, path]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.previewOverlay} onPress={onClose}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.gold} />
        ) : signedUrl ? (
          <Image source={{ uri: signedUrl }} style={styles.previewImage} resizeMode="contain" />
        ) : null}
      </Pressable>
    </Modal>
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
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    marginRight: 12,
  },
  doneText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gold,
  },
  tabBar: {
    backgroundColor: "#1A1A1A",
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  tabBarContent: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: COLORS.gold,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },
  tabTextActive: {
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
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  addPairButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.gold,
    padding: 14,
    borderRadius: RADIUS.md,
  },
  addPairButtonText: {
    color: COLORS.gold,
    fontWeight: "700",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "80%",
  },
});
