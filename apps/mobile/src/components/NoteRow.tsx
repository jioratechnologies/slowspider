import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isAttachment, type RemoteNote } from "../api";
import { theme } from "../theme";
import NoteMedia from "./NoteMedia";

export default function NoteRow({ note, mine, onDelete }: { note: RemoteNote; mine: boolean; onDelete: () => void }) {
  const isPrivate = note.visibility === "private";
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.kind}>{note.kind}</Text>
        <View style={[styles.badge, isPrivate ? styles.badgePrivate : styles.badgeShared]}>
          <Ionicons name={isPrivate ? "eye-off" : "eye"} size={9} color={isPrivate ? theme.star : theme.low} />
          <Text style={[styles.badgeText, { color: isPrivate ? theme.star : theme.low }]}>{isPrivate ? "Private" : "Shared"}</Text>
        </View>
        <Text style={styles.date}>
          {new Date(note.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </Text>
        {mine && (
          <Pressable hitSlop={8} onPress={onDelete}>
            <Ionicons name="trash-outline" size={14} color={theme.danger} />
          </Pressable>
        )}
      </View>
      <NoteBody note={note} />
    </View>
  );
}

function NoteBody({ note }: { note: RemoteNote }) {
  if (isAttachment(note.kind)) return <NoteMedia note={note} />;

  if (note.kind === "link") {
    return (
      <Pressable onPress={() => note.url && Linking.openURL(note.url)}>
        <Text style={styles.link}>{note.body || note.url}</Text>
      </Pressable>
    );
  }

  if (note.kind === "code") {
    return (
      <View style={styles.code}>
        <Text style={styles.codeText}>{note.body}</Text>
      </View>
    );
  }

  if (note.kind === "table") {
    const rows = note.body
      .split("\n")
      .filter((r) => r.trim())
      .map((r) => r.split("|").map((c) => c.trim()));
    if (!rows.length) return null;
    return (
      <View style={styles.table}>
        {rows.map((cells, ri) => (
          <View key={ri} style={styles.tableRow}>
            {cells.map((cell, ci) => (
              <View key={ci} style={[styles.tableCell, ri === 0 && styles.tableCellHead]}>
                <Text style={[styles.tableCellText, ri === 0 && styles.tableCellTextHead]}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (note.kind === "rich") {
    // Rich notes are authored on the web with real HTML; mobile shows the text content so
    // it stays readable rather than pulling in a full rich-text renderer.
    return <Text style={styles.body}>{note.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}</Text>;
  }

  return <Text style={styles.body}>{note.body}</Text>;
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.panel2, borderRadius: 12, padding: 11, gap: 7 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  kind: { color: theme.ink3, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 },
  badge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  badgePrivate: { backgroundColor: theme.star + "22" },
  badgeShared: { backgroundColor: theme.low + "22" },
  badgeText: { fontSize: 9.5, fontWeight: "700" },
  date: { color: theme.ink3, fontSize: 10.5, marginLeft: "auto" },
  body: { color: theme.ink, fontSize: 14, lineHeight: 19 },
  link: { color: theme.low, fontSize: 14 },
  code: { backgroundColor: theme.bg, borderRadius: 8, padding: 9 },
  codeText: { color: theme.ink, fontSize: 12, fontFamily: "monospace" },
  table: { borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 8, overflow: "hidden" },
  tableRow: { flexDirection: "row" },
  tableCell: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.lineStrong, padding: 6 },
  tableCellHead: { backgroundColor: theme.bg },
  tableCellText: { color: theme.ink, fontSize: 12 },
  tableCellTextHead: { fontWeight: "700" },
});
