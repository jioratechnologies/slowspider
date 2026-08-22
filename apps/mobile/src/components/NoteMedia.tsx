import { useEffect, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { api, type RemoteNote } from "../api";
import { theme } from "../theme";

/**
 * Storage objects are private, so the stored path is traded for a short-lived signed URL
 * at render time rather than being linked directly.
 */
export default function NoteMedia({ note }: { note: RemoteNote }) {
  const [signed, setSigned] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!note.url) return;
    let live = true;
    api
      .mediaUrl(note.url)
      .then((r) => live && setSigned(r.url))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [note.url]);

  if (failed) return <Text style={styles.dim}>Couldn&apos;t load this file.</Text>;
  if (!signed) return <Text style={styles.dim}>Loading…</Text>;

  if (note.kind === "voice") return <VoicePlayer url={signed} durationMs={note.duration_ms} />;
  if (note.kind === "image") return <Image source={{ uri: signed }} style={styles.image} resizeMode="cover" />;

  return (
    <Pressable style={styles.openRow} onPress={() => Linking.openURL(signed)}>
      <Ionicons name={note.kind === "video" ? "play-circle" : "open-outline"} size={18} color={theme.low} />
      <Text style={styles.openText}>{note.kind === "video" ? "Play video" : "Open file"}</Text>
    </Pressable>
  );
}

function VoicePlayer({ url, durationMs }: { url: string; durationMs: number | null }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const total = durationMs ? durationMs / 1000 : status.duration || 0;
  const current = status.currentTime || 0;
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <View style={styles.voiceRow}>
      <Pressable
        hitSlop={8}
        onPress={() => {
          if (status.playing) player.pause();
          else {
            // Restarts from the top once it has run to the end, instead of no-opping.
            if (total > 0 && current >= total - 0.25) player.seekTo(0);
            player.play();
          }
        }}
      >
        <Ionicons name={status.playing ? "pause-circle" : "play-circle"} size={30} color={theme.accent} />
      </Pressable>
      <View style={styles.voiceBarWrap}>
        <View style={styles.voiceTrack}>
          <View style={[styles.voiceFill, { width: `${pct}%` }]} />
        </View>
      </View>
      <Text style={styles.voiceTime}>{fmtSeconds(total > 0 ? total - current : 0)}</Text>
    </View>
  );
}

function fmtSeconds(s: number): string {
  const total = Math.max(0, Math.round(s));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  dim: { color: theme.ink3, fontSize: 12 },
  image: { width: "100%", height: 190, borderRadius: 10, backgroundColor: theme.panel2 },
  openRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  openText: { color: theme.low, fontSize: 14 },
  voiceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  voiceBarWrap: { flex: 1 },
  voiceTrack: { height: 4, borderRadius: 2, backgroundColor: theme.panel2, overflow: "hidden" },
  voiceFill: { height: "100%", backgroundColor: theme.accent },
  voiceTime: { color: theme.ink3, fontSize: 11, minWidth: 34, textAlign: "right" },
});
