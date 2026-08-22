import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RemoteNote } from "../api";
import { formatBytes, kindForMime, pickDocument, pickMedia, uploadPicked, type PickedFile } from "../upload";
import { theme } from "../theme";
import NoteMedia from "./NoteMedia";
import VoiceRecorder from "./VoiceRecorder";

const QUOTA_BYTES = 10 * 1024 * 1024 * 1024;

function iconFor(kind: string): keyof typeof Ionicons.glyphMap {
  if (kind === "voice") return "mic";
  if (kind === "image") return "image";
  if (kind === "video") return "videocam";
  return "document";
}

function displayName(note: RemoteNote): string {
  if (note.kind === "voice" && (note.body.startsWith("voice-") || note.body.startsWith("Audio_Record_"))) return "Voice Recording";
  return note.body || "Untitled";
}

/** Raw files hanging off a task — the mobile twin of web's TaskAttachmentsSection. */
export default function AttachmentsSection({
  taskId,
  attachments,
  storageUsed,
  currentUserId,
  onAdd,
  onDelete,
}: {
  taskId: number;
  attachments: RemoteNote[];
  storageUsed: number;
  currentUserId: string;
  onAdd: (input: Record<string, unknown>) => Promise<unknown>;
  onDelete: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function attach(pick: () => Promise<PickedFile | null>) {
    setError(null);
    let file: PickedFile | null;
    try {
      file = await pick();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the picker.");
      return;
    }
    if (!file) return;

    setBusy(true);
    try {
      const { path, size } = await uploadPicked(file);
      await onAdd({
        task_id: taskId,
        cluster_id: null,
        kind: kindForMime(file.mime),
        visibility: "workspace",
        body: file.name,
        url: path,
        mime: file.mime,
        size_bytes: size,
        duration_ms: null,
        pos: attachments.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addVoice(uri: string, durationMs: number) {
    setBusy(true);
    setError(null);
    try {
      const name = `voice-${Date.now()}.m4a`;
      const { path, size } = await uploadPicked({ uri, name, mime: "audio/m4a", size: 0 });
      await onAdd({
        task_id: taskId,
        cluster_id: null,
        kind: "voice",
        visibility: "workspace",
        body: name,
        url: path,
        mime: "audio/m4a",
        size_bytes: size,
        duration_ms: durationMs,
        pos: attachments.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const quotaPct = Math.min(100, Math.round((storageUsed / QUOTA_BYTES) * 100));

  return (
    <View style={styles.wrap}>
      <View style={styles.controls}>
        <VoiceRecorder onRecorded={addVoice} disabled={busy} />
        <Pressable style={[styles.btn, busy && styles.disabled]} disabled={busy} onPress={() => attach(pickMedia)}>
          <Ionicons name="image-outline" size={15} color={theme.ink} />
          <Text style={styles.btnText}>Photo / video</Text>
        </Pressable>
        <Pressable style={[styles.btn, busy && styles.disabled]} disabled={busy} onPress={() => attach(pickDocument)}>
          {busy ? <ActivityIndicator size="small" color={theme.ink} /> : <Ionicons name="attach-outline" size={15} color={theme.ink} />}
          <Text style={styles.btnText}>Attach file</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {attachments.length === 0 ? (
        <Text style={styles.hint}>No attachments yet.</Text>
      ) : (
        <View style={styles.list}>
          {attachments.map((a) => (
            <View key={a.id} style={styles.row}>
              <View style={styles.rowHead}>
                <Ionicons name={iconFor(a.kind)} size={15} color={theme.ink3} />
                <Pressable style={styles.rowName} onPress={() => setExpanded(expanded === a.id ? null : a.id)}>
                  <Text style={styles.rowNameText} numberOfLines={1}>
                    {displayName(a)}
                  </Text>
                </Pressable>
                {a.size_bytes > 0 && <Text style={styles.rowSize}>{formatBytes(a.size_bytes)}</Text>}
                {a.created_by === currentUserId && (
                  <Pressable hitSlop={8} onPress={() => onDelete(a.id)}>
                    <Ionicons name="trash-outline" size={15} color={theme.danger} />
                  </Pressable>
                )}
              </View>
              {expanded === a.id && (
                <View style={styles.preview}>
                  <NoteMedia note={a} />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.quotaWrap}>
        <View style={styles.quotaTrack}>
          <View style={[styles.quotaFill, { width: `${quotaPct}%` }, quotaPct > 90 && { backgroundColor: theme.danger }]} />
        </View>
        <Text style={styles.quotaText}>
          {formatBytes(storageUsed)} / {formatBytes(QUOTA_BYTES)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  disabled: { opacity: 0.5 },
  error: { color: theme.danger, fontSize: 12.5 },
  hint: { color: theme.ink3, fontSize: 12 },
  list: { gap: 6 },
  row: { backgroundColor: theme.panel2, borderRadius: 10, overflow: "hidden" },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 9 },
  rowName: { flex: 1, minWidth: 0 },
  rowNameText: { color: theme.ink, fontSize: 13 },
  rowSize: { color: theme.ink3, fontSize: 11 },
  preview: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.lineStrong, padding: 10 },
  quotaWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  quotaTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.panel2, overflow: "hidden" },
  quotaFill: { height: "100%", backgroundColor: theme.accent },
  quotaText: { color: theme.ink3, fontSize: 11 },
});
