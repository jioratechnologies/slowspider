import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

export default function VoiceRecorder({
  onRecorded,
  disabled,
  compact = false,
}: {
  onRecorded: (uri: string, durationMs: number) => void;
  disabled?: boolean;
  /** Icon-only circle, for toolbars that sit next to other round buttons. */
  compact?: boolean;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone permission denied.");
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stop() {
    const durationMs = state.durationMillis ?? 0;
    await recorder.stop();
    // `uri` is only populated once stop() resolves, so it has to be read after the await.
    if (recorder.uri) onRecorded(recorder.uri, durationMs);
  }

  const seconds = Math.floor((state.durationMillis ?? 0) / 1000);
  const timer = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (state.isRecording) {
    return (
      <Pressable style={styles.recording} onPress={stop}>
        <View style={styles.pulse} />
        <Text style={styles.timer}>{timer}</Text>
        <Ionicons name="stop-circle" size={18} color={theme.danger} />
      </Pressable>
    );
  }

  return (
    <View style={compact ? undefined : styles.inline}>
      <Pressable style={[compact ? styles.circle : styles.btn, disabled && styles.disabled]} onPress={start} disabled={disabled}>
        <Ionicons name="mic-outline" size={compact ? 18 : 15} color={theme.ink} />
        {!compact && <Text style={styles.btnText}>Record</Text>}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: theme.lineStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  btnText: { color: theme.ink, fontSize: 13 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  recording: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pulse: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.danger },
  timer: { color: theme.danger, fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "600" },
  error: { color: theme.danger, fontSize: 12 },
});
