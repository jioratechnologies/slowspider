import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Chip, HelperText, IconButton, Text, TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { useBoard } from "../store/BoardContext";
import { formatBytes, kindForMime, pickDocument, pickMedia, uploadPicked, type PickedFile } from "../upload";
import Sheet from "./Sheet";
import VoiceRecorder from "./VoiceRecorder";

/**
 * Capture-first entry point behind the FAB: a title, an optional destination cluster, and
 * any number of attachments staged locally. Nothing uploads until Save, so backing out
 * costs nothing.
 */
export default function QuickCaptureSheet({
  visible,
  defaultClusterId,
  onClose,
}: {
  visible: boolean;
  defaultClusterId: number | null;
  onClose: () => void;
}) {
  const { data, addTask, addNote } = useBoard();
  const [title, setTitle] = useState("");
  const [clusterId, setClusterId] = useState<number | null>(defaultClusterId);
  const [staged, setStaged] = useState<(PickedFile & { durationMs?: number })[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle("");
      setStaged([]);
      setError(null);
      setClusterId(defaultClusterId);
    }
  }, [visible, defaultClusterId]);

  async function stage(pick: () => Promise<PickedFile | null>) {
    setError(null);
    try {
      const file = await pick();
      if (file) setStaged((prev) => [...prev, file]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the picker.");
    }
  }

  function stageVoice(uri: string, durationMs: number) {
    setStaged((prev) => [...prev, { uri, name: `voice-${Date.now()}.m4a`, mime: "audio/m4a", size: 0, durationMs }]);
  }

  async function save() {
    const text = title.trim();
    if (!text && staged.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      const task = await addTask(text || "Attached files", clusterId);
      if (!task) throw new Error("Couldn't create that task.");

      for (let i = 0; i < staged.length; i++) {
        const f = staged[i];
        const { path, size } = await uploadPicked(f);
        await addNote({
          task_id: task.id,
          cluster_id: null,
          kind: kindForMime(f.mime),
          visibility: "workspace",
          body: f.name,
          url: path,
          mime: f.mime,
          size_bytes: size,
          duration_ms: f.durationMs ?? null,
          pos: i,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  const clusters = (data?.clusters || []).filter((c) => c.status === "active");
  const canSave = (title.trim().length > 0 || staged.length > 0) && !busy;

  return (
    <Sheet visible={visible} onClose={onClose} snapPoints={["72%"]}>
      <Text variant="titleLarge">New task</Text>

      <TextInput
        mode="outlined"
        label="What needs doing?"
        value={title}
        onChangeText={setTitle}
        multiline
        autoFocus
        style={styles.input}
      />

      {staged.length > 0 && (
        <View style={styles.staged}>
          {staged.map((f, i) => (
            <View key={`${f.uri}-${i}`} style={styles.stagedRow}>
              <Ionicons
                name={kindForMime(f.mime) === "voice" ? "mic" : kindForMime(f.mime) === "image" ? "image" : "document"}
                size={15}
                color={theme.ink3}
              />
              <Text variant="bodyMedium" numberOfLines={1} style={styles.stagedName}>
                {f.name}
              </Text>
              {f.size > 0 && (
                <Text variant="bodySmall" style={styles.dim}>
                  {formatBytes(f.size)}
                </Text>
              )}
              <IconButton icon="close" size={16} onPress={() => setStaged((prev) => prev.filter((_, idx) => idx !== i))} />
            </View>
          ))}
        </View>
      )}

      <View style={styles.tools}>
        <VoiceRecorder onRecorded={stageVoice} disabled={busy} compact />
        <IconButton icon="image-outline" mode="outlined" size={20} disabled={busy} onPress={() => stage(pickMedia)} />
        <IconButton icon="paperclip" mode="outlined" size={20} disabled={busy} onPress={() => stage(pickDocument)} />
      </View>

      <Text variant="labelMedium" style={styles.label}>
        Goes to
      </Text>
      <View style={styles.chips}>
        <Chip selected={clusterId === null} showSelectedCheck={false} onPress={() => setClusterId(null)}>
          Floating
        </Chip>
        {clusters.map((c) => (
          <Chip
            key={c.id}
            selected={clusterId === c.id}
            showSelectedCheck={false}
            onPress={() => setClusterId(c.id)}
            avatar={<View style={[styles.dot, { backgroundColor: c.color }]} />}
          >
            {c.name}
          </Chip>
        ))}
      </View>

      {error ? <HelperText type="error">{error}</HelperText> : null}

      <View style={styles.actions}>
        <Button mode="text" onPress={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button mode="contained" onPress={save} disabled={!canSave} loading={busy}>
          Add task
        </Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: theme.panel },
  staged: { gap: 6 },
  stagedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.panel2,
    borderRadius: 10,
    paddingLeft: 12,
  },
  stagedName: { flex: 1 },
  dim: { color: theme.ink3 },
  tools: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { color: theme.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, alignSelf: "center" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
});
