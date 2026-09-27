import { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";

type ConfirmButtonStyle = "default" | "destructive" | "warning";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: ConfirmButtonStyle;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  extraButton?: {
    text: string;
    style?: ConfirmButtonStyle;
    onPress: () => void;
  };
}

const BUTTON_VISUALS: Record<ConfirmButtonStyle, { button: object; text: object }> = {
  default: {
    button: { backgroundColor: COLORS.gold },
    text: { color: "#000000" },
  },
  destructive: {
    button: { backgroundColor: COLORS.dangerBg, borderWidth: 1, borderColor: COLORS.danger },
    text: { color: COLORS.danger },
  },
  warning: {
    button: { backgroundColor: COLORS.warningBg, borderWidth: 1, borderColor: COLORS.warning },
    text: { color: COLORS.warning },
  },
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmStyle = "default",
  onConfirm,
  onCancel,
  loading = false,
  extraButton,
}: ConfirmModalProps) {
  const [pressedButton, setPressedButton] = useState<"confirm" | "extra" | null>(null);

  useEffect(() => {
    if (!visible) {
      setPressedButton(null);
    }
  }, [visible]);

  const handleConfirmPress = () => {
    setPressedButton("confirm");
    onConfirm();
  };

  const handleExtraPress = () => {
    setPressedButton("extra");
    extraButton?.onPress();
  };

  const confirmVisuals = BUTTON_VISUALS[confirmStyle];
  const extraVisuals = extraButton ? BUTTON_VISUALS[extraButton.style ?? "default"] : null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.accentLine} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.button, confirmVisuals.button]}
            onPress={handleConfirmPress}
            disabled={loading}
          >
            {loading && pressedButton === "confirm" ? (
              <ActivityIndicator color={(confirmVisuals.text as any).color} size="small" />
            ) : (
              <Text style={[styles.buttonText, confirmVisuals.text]}>{confirmText}</Text>
            )}
          </TouchableOpacity>

          {extraButton && extraVisuals ? (
            <TouchableOpacity
              style={[styles.button, extraVisuals.button]}
              onPress={handleExtraPress}
              disabled={loading}
            >
              {loading && pressedButton === "extra" ? (
                <ActivityIndicator color={(extraVisuals.text as any).color} size="small" />
              ) : (
                <Text style={[styles.buttonText, extraVisuals.text]}>{extraButton.text}</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>{cancelText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    marginHorizontal: 24,
  },
  accentLine: {
    height: 2,
    width: 40,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 24,
  },
  button: {
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceElevated,
  },
  cancelButtonText: {
    color: COLORS.textMuted,
  },
});
