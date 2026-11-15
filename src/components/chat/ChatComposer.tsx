import { useState } from "react";
import { View, TextInput, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import Loader from "../Loader";

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending?: boolean;
  placeholder?: string;
}

// Rounded message box that grows with its content. Enter sends on web (Shift+Enter = new line).
export default function ChatComposer({ value, onChangeText, onSend, sending = false, placeholder }: ChatComposerProps) {
  const [height, setHeight] = useState(40);
  const disabled = sending || !value.trim();

  return (
    <View style={styles.bar}>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, { height: Math.min(120, Math.max(40, height)) }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? "Type a message…"}
          placeholderTextColor={COLORS.textMuted}
          multiline
          editable={!sending}
          onContentSizeChange={(e) => setHeight(e.nativeEvent.contentSize.height + 2)}
          onKeyPress={(e: any) => {
            if (Platform.OS === "web" && e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) {
              e.preventDefault?.();
              if (!disabled) onSend();
            }
          }}
        />
      </View>
      <TouchableOpacity
        style={[styles.send, disabled && styles.sendDisabled]}
        onPress={onSend}
        disabled={disabled}
        accessibilityLabel="Send message"
      >
        {sending ? <Loader tone="dark" /> : <Ionicons name="send" size={18} color="#1A1A1A" />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    ...SHADOW.up,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: COLORS.cardHigh,
    borderRadius: 22,
    paddingHorizontal: 16,
    ...SHADOW.card,
  },
  input: {
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingVertical: 10,
    outlineStyle: "none",
  } as any,
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.45 },
});
