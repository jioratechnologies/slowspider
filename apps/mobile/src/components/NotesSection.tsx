import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RemoteNote, TextNoteKind } from "../api";
import { isTextNote } from "../api";
import { theme } from "../theme";
import NoteRow from "./NoteRow";

const COMPOSERS: { kind: TextNoteKind; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: "text", label: "Text", icon: "document-text-outline" },
  { kind: "code", label: "Code", icon: "code-slash-outline" },
  { kind: "link", label: "Link", icon: "link-outline" },
  { kind: "table", label: "Table", icon: "grid-outline" },
];

/**
 * Authored notes only — text/code/link/table. Raw files live in AttachmentsSection, the
 * same split the web app uses so a note written on either client lands in the same place.
 */
export default function NotesSection({
  parent,
  notes,
  userId,
  resetKey,
  onAdd,
  onDelete,
}: {
  parent: { task_id: number | null; cluster_id: number | null };
  notes: RemoteNote[];
  userId: string;
  resetKey: number;
  onAdd: (input: Record<string, unknown>) => Promise<unknown>;
  onDelete: (id: number) => void;
}) {
  const [kind, setKind] = useState<TextNoteKind>("text");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBody("");
    setLinkUrl("");
    setKind("text");
    setError(null);
  }, [resetKey]);

  const textNotes = notes.filter((n) => isTextNote(n.kind)).sort((a, b) => a.created_at.localeCompare(b.created_at));

  async function submit() {
    const isLink = kind === "link";
    const url = linkUrl.trim();
    const text = body.trim();
    if (isLink ? !url : !text) return;

    setBusy(true);
    setError(null);
    try {
      await onAdd({
        task_id: parent.task_id,
        cluster_id: parent.cluster_id,
        kind,
        visibility: isPrivate ? "private" : "workspace",
        body: text,
        url: isLink ? url : null,
        mime: null,
        size_bytes: 0,
        duration_ms: null,
        pos: textNotes.length,
      });
      setBody("");
      setLinkUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <View style={styles.kindGroup}>
          {COMPOSERS.map((c) => {
            const on = kind === c.kind;
            return (
              <Pressable key={c.kind} style={[styles.kindBtn, on && styles.kindBtnOn]} onPress={() => setKind(c.kind)}>
                <Ionicons name={c.icon} size={15} color={on ? theme.accentInk : theme.muted} />
              </Pressable>
            );
          })}
        </View>
        <Pressable style={[styles.privacy, isPrivate && styles.privacyOn]} onPress={() => setIsPrivate((v) => !v)}>
          <Ionicons name={isPrivate ? "eye-off-outline" : "eye-outline"} size={13} color={isPrivate ? theme.star : theme.muted} />
          <Text style={[styles.privacyText, isPrivate && { color: theme.star }]}>{isPrivate ? "Private" : "Shared"}</Text>
        </Pressable>
      </View>

      {kind === "link" ? (
        <View style={styles.stack}>
          <TextInput
            style={styles.input}
            value={linkUrl}
            placeholder="https://…"
            placeholderTextColor={theme.ink3}
            autoCapitalize="none"
            keyboardType="url"
            onChangeText={setLinkUrl}
          />
          <TextInput
            style={styles.input}
            value={body}
            placeholder="What is it? (optional)"
            placeholderTextColor={theme.ink3}
            onChangeText={setBody}
          />
        </View>
      ) : (
        <TextInput
          style={[styles.input, styles.multiline, kind !== "text" && styles.mono]}
          value={body}
          placeholder={
            kind === "code"
              ? "Paste code — kept as-is"
              : kind === "table"
                ? "One row per line, cells split by |"
                : "Write a note…"
          }
          placeholderTextColor={theme.ink3}
          onChangeText={setBody}
          multiline
          autoCapitalize={kind === "code" ? "none" : "sentences"}
        />
      )}

      <Pressable style={[styles.addBtn, busy && styles.disabled]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator size="small" color={theme.accentInk} /> : <Text style={styles.addBtnText}>Add note</Text>}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.list}>
        {textNotes.length === 0 ? (
          <Text style={styles.hint}>No notes yet.</Text>
        ) : (
          textNotes.map((n) => <NoteRow key={n.id} note={n} mine={n.created_by === userId} onDelete={() => onDelete(n.id)} />)
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8 },
  kindGroup: { flexDirection: "row", backgroundColor: theme.panel2, borderRadius: 10, padding: 3, gap: 2 },
  kindBtn: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8 },
  kindBtnOn: { backgroundColor: theme.accent },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: "auto",
    borderWidth: 1,
    borderColor: theme.lineStrong,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  privacyOn: { borderColor: theme.star },
  privacyText: { color: theme.muted, fontSize: 12 },
  stack: { gap: 8 },
  input: {
    backgroundColor: theme.panel2,
    borderColor: theme.lineStrong,
    borderWidth: 1,
    borderRadius: 10,
    color: theme.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: { minHeight: 78, textAlignVertical: "top" },
  mono: { fontFamily: "monospace", fontSize: 13 },
  addBtn: { backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  disabled: { opacity: 0.5 },
  addBtnText: { color: theme.accentInk, fontSize: 14, fontWeight: "700" },
  error: { color: theme.danger, fontSize: 12.5 },
  hint: { color: theme.ink3, fontSize: 12, fontStyle: "italic" },
  list: { gap: 8 },
});
