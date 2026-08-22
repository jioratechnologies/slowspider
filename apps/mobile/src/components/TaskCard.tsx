import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RemoteNote, RemoteTask } from "../api";
import { dateClass, displayTitle, fmtDate, taskProgress } from "../helpers";
import { PRIO_COLOR, theme } from "../theme";

const PRIO_LABEL: Record<string, string> = { high: "High", med: "Med", low: "Low", none: "" };

function chipIcon(kind: string): keyof typeof Ionicons.glyphMap {
  if (kind === "voice") return "mic";
  if (kind === "image") return "image";
  if (kind === "video") return "videocam";
  return "document-attach";
}

function chipLabel(note: RemoteNote): string {
  if (note.kind === "voice" && (note.body.startsWith("voice-") || note.body.startsWith("Audio_Record_"))) return "Voice";
  return note.body || note.kind;
}

function chipColor(kind: string, text: string) {
  if (kind === "voice" || text.startsWith("Audio_Record")) return { color: "#facc15", bg: "#facc151a", border: "#facc1555" };
  if (kind === "image" || text.startsWith("cluster")) return { color: "#3b82f6", bg: "#3b82f61a", border: "#3b82f655" };
  return { color: "#a855f7", bg: "#a855f71a", border: "#a855f755" };
}

export default function TaskCard({
  task,
  noteCount,
  attachments,
  onToggle,
  onOpen,
  onStar,
  onNotes,
}: {
  task: RemoteTask;
  noteCount: number;
  attachments: RemoteNote[];
  onToggle: () => void;
  onOpen: () => void;
  onStar: () => void;
  onNotes: () => void;
}) {
  const progress = task.milestones?.length ? taskProgress(task) : null;
  const dcls = task.deadline ? dateClass(task.deadline) : "";
  const deadlineColor = dcls === "overdue" ? theme.danger : dcls === "soon" ? theme.med : theme.ink3;
  const prioColor = PRIO_COLOR[task.priority] || theme.none;
  const hasPrio = task.priority !== "none";

  return (
    <View style={[styles.card, task.done && styles.done]}>
      <View style={styles.topRow}>
        <Pressable style={styles.checkTap} onPress={onToggle} hitSlop={6}>
          <View style={[styles.check, task.done && styles.checkOn]}>
            {task.done ? <Ionicons name="checkmark" size={13} color={theme.accentInk} /> : null}
          </View>
        </Pressable>

        <Pressable style={styles.body} onPress={onOpen}>
          <Text style={[styles.title, task.done && styles.titleDone]}>{displayTitle(task.title) || "Untitled task"}</Text>
          {displayTitle(task.title)?.startsWith("http") && (
            <View style={styles.linkPreviewBlock}>
              <View style={styles.linkPreviewHeader}>
                <Ionicons name="globe-outline" size={12} color="#3b82f6" />
                <Text style={styles.linkPreviewUrl} numberOfLines={1}>{displayTitle(task.title)}</Text>
                <View style={{flex: 1}} />
                <Ionicons name="eye-outline" size={12} color={theme.muted} />
                <Text style={styles.linkPreviewAction}>Preview</Text>
                <Ionicons name="open-outline" size={12} color="#3b82f6" style={{marginLeft: 8}}/>
                <Text style={[styles.linkPreviewAction, {color: "#3b82f6"}]}>Open</Text>
              </View>
              <Text style={styles.linkPreviewFullUrl} numberOfLines={1}>{displayTitle(task.title)}</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionIcon} onPress={onOpen} hitSlop={6}>
            <Ionicons name="create-outline" size={16} color={theme.ink3} />
          </Pressable>
          <Pressable style={styles.actionIcon} onPress={onOpen} hitSlop={6}>
            <Ionicons name="pencil-outline" size={16} color={theme.ink3} />
          </Pressable>
          <Pressable style={styles.actionIcon} onPress={onOpen} hitSlop={6}>
            <Ionicons name="trash-outline" size={16} color={theme.ink3} />
          </Pressable>
          <Pressable style={styles.starTap} onPress={onStar} hitSlop={6}>
            <Ionicons name={task.starred ? "star" : "star-outline"} size={16} color={task.starred ? theme.star : theme.ink3} />
          </Pressable>
        </View>
      </View>

      {(hasPrio || task.deadline || noteCount > 0 || attachments.length > 0) && (
        <View style={styles.chipRow}>
          {hasPrio && !task.done && (
            <View style={[styles.prioChip, { backgroundColor: prioColor + "26", borderColor: prioColor + "55" }]}>
              <View style={[styles.prioDot, { backgroundColor: prioColor }]} />
              <Text style={[styles.chipText, { color: prioColor }]}>{PRIO_LABEL[task.priority]}</Text>
            </View>
          )}

          {task.deadline && (
            <View style={[styles.chip, { borderColor: deadlineColor + "55" }]}>
              <Ionicons name="calendar-outline" size={11} color={deadlineColor} />
              <Text style={[styles.chipText, { color: deadlineColor }]}>
                {fmtDate(task.deadline)}
                {task.deadline_time ? ` · ${task.deadline_time}` : ""}
              </Text>
            </View>
          )}

          {noteCount > 0 && (
            <Pressable style={[styles.chip, { backgroundColor: "#a855f71a", borderColor: "#a855f755" }]} onPress={onNotes}>
              <Ionicons name="create-outline" size={11} color="#a855f7" />
              <Text style={[styles.chipText, { color: "#a855f7" }]}>
                {noteCount} note{noteCount > 1 ? "s" : ""}
              </Text>
            </Pressable>
          )}

          {attachments.slice(0, 3).map((a) => {
            const label = chipLabel(a);
            const style = chipColor(a.kind, label);
            return (
              <Pressable key={a.id} style={[styles.chip, { backgroundColor: style.bg, borderColor: style.border }]} onPress={onOpen}>
                <Ionicons name={chipIcon(a.kind)} size={11} color={style.color} />
                <Text style={[styles.chipText, { color: style.color }]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
          {attachments.length > 3 && (
            <Pressable style={[styles.chip, { backgroundColor: theme.panel2, borderColor: theme.lineStrong }]} onPress={onOpen}>
              <Text style={styles.chipText}>+{attachments.length - 3}</Text>
            </Pressable>
          )}
        </View>
      )}

      {progress && progress.total > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress.pct}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {progress.done}/{progress.total}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.panel,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.line,
  },
  done: { opacity: 0.55 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  checkTap: { paddingTop: 2 },
  check: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  body: { flex: 1, minWidth: 0 },
  title: { color: theme.ink, fontSize: 15, lineHeight: 22 },
  titleDone: { textDecorationLine: "line-through", color: theme.muted },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionIcon: { padding: 2 },
  starTap: { padding: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingLeft: 30 },
  prioChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  prioDot: { width: 6, height: 6, borderRadius: 3 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 150,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: { fontSize: 11, fontWeight: "600", flexShrink: 1 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 30 },
  progressTrack: { flex: 1, height: 2, borderRadius: 1, backgroundColor: theme.lineStrong, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.ink3 },
  progressText: { color: theme.ink3, fontSize: 10, fontWeight: "500" },
  linkPreviewBlock: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.lineStrong,
    borderRadius: 8,
    padding: 10,
    backgroundColor: theme.bg,
  },
  linkPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  linkPreviewUrl: {
    color: theme.muted,
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
  },
  linkPreviewAction: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 4,
  },
  linkPreviewFullUrl: {
    color: "#3b82f6",
    fontSize: 12,
  },
});
