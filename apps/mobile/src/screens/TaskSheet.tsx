import { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Checkbox, Chip, IconButton, List, SegmentedButtons, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isAttachment, type Priority } from "../api";
import { displayTitle } from "../helpers";
import { PRIO_COLOR, theme } from "../theme";
import { useBoard } from "../store/BoardContext";
import AttachmentsSection from "../components/AttachmentsSection";

const PRIOS: { value: Priority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "med", label: "Med" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
];

export default function TaskSheet() {
  const {
    data,
    userId,
    openTaskId,
    setOpenTaskId,
    setOpenNotesTaskId,
    patchTask,
    moveTask,
    addMilestone,
    toggleMilestone,
    renameMilestone,
    deleteMilestone,
    addNote,
    deleteNote,
  } = useBoard();
  const [msInput, setMsInput] = useState("");
  const insets = useSafeAreaInsets();

  const task = data?.tasks.find((t) => t.id === openTaskId) || null;
  if (!task) return null;

  const notes = (data?.notes || []).filter((n) => n.task_id === task.id);
  const attachments = notes.filter((n) => isAttachment(n.kind));
  const noteCount = notes.length - attachments.length;
  const milestones = task.milestones || [];
  const clusters = (data?.clusters || []).filter((c) => c.status === "active");
  const close = () => setOpenTaskId(null);

  function submitMilestone() {
    const v = msInput.trim();
    if (!v) return;
    addMilestone(task!.id, v);
    setMsInput("");
  }

  function confirmBin() {
    Alert.alert("Move to bin?", `"${displayTitle(task!.title) || "Untitled"}" goes to the Dumping bin.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Move to bin",
        style: "destructive",
        onPress: () => {
          patchTask(task!.id, { binned: true, cold: false, binned_at: new Date().toISOString() });
          close();
        },
      },
    ]);
  }

  return (
    // `onRequestClose` is what wires the Android back gesture and back button to dismiss.
    <Modal visible animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.wrap, { paddingTop: insets.top }]}>
        <Appbar.Header style={styles.appBar} statusBarHeight={0}>
          <Appbar.BackAction onPress={close} />
          <Appbar.Content title="Task" titleStyle={styles.appBarTitle} />
          <Appbar.Action
            icon={task.starred ? "star" : "star-outline"}
            iconColor={task.starred ? theme.star : theme.ink}
            onPress={() => patchTask(task.id, { starred: !task.starred })}
          />
          <Appbar.Action icon="trash-can-outline" iconColor={theme.danger} onPress={confirmBin} />
        </Appbar.Header>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            mode="flat"
            value={task.title}
            placeholder="Untitled"
            onChangeText={(v) => patchTask(task.id, { title: v })}
            multiline
            underlineColor="transparent"
            activeUnderlineColor={theme.lineStrong}
            style={styles.title}
            contentStyle={styles.titleContent}
          />

          <List.Item
            title="Notes"
            description={noteCount > 0 ? `${noteCount} note${noteCount > 1 ? "s" : ""}` : "None yet"}
            left={(p) => <List.Icon {...p} icon="note-text-outline" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            style={styles.notesRow}
            onPress={() => setOpenNotesTaskId(task.id)}
          />

          <Text variant="labelMedium" style={styles.label}>
            Priority
          </Text>
          <SegmentedButtons
            value={task.priority}
            onValueChange={(v) => patchTask(task.id, { priority: v as Priority })}
            density="medium"
            buttons={PRIOS.map((p) => ({
              value: p.value,
              label: p.label,
              checkedColor: p.value === "none" ? theme.ink : theme.accentInk,
              style: task.priority === p.value && p.value !== "none" ? { backgroundColor: PRIO_COLOR[p.value] } : undefined,
            }))}
          />

          <Text variant="labelMedium" style={styles.label}>
            Deadline
          </Text>
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              dense
              label="YYYY-MM-DD"
              value={task.deadline || ""}
              onChangeText={(v) => patchTask(task.id, { deadline: v || null })}
              style={styles.flex}
            />
            <TextInput
              mode="outlined"
              dense
              label="HH:MM"
              value={task.deadline_time || ""}
              onChangeText={(v) => patchTask(task.id, { deadline_time: v || null })}
              style={styles.flex}
            />
          </View>
          <Text variant="bodySmall" style={styles.hint}>
            A time is what makes it eligible for calendar sync.
          </Text>

          <Text variant="labelMedium" style={styles.label}>
            Cluster
          </Text>
          <View style={styles.chips}>
            <Chip selected={task.cluster_id === null} showSelectedCheck={false} onPress={() => moveTask(task.id, null)}>
              Floating
            </Chip>
            {clusters.map((c) => (
              <Chip
                key={c.id}
                selected={task.cluster_id === c.id}
                showSelectedCheck={false}
                onPress={() => moveTask(task.id, c.id)}
                avatar={<View style={[styles.dot, { backgroundColor: c.color }]} />}
              >
                {c.name}
              </Chip>
            ))}
          </View>

          <Text variant="labelMedium" style={styles.label}>
            Milestones
          </Text>
          {milestones.length === 0 ? (
            <Text variant="bodySmall" style={styles.hint}>
              No milestones yet.
            </Text>
          ) : (
            milestones.map((m) => (
              <View key={m.id} style={styles.msRow}>
                <Checkbox status={m.done ? "checked" : "unchecked"} onPress={() => toggleMilestone(task.id, m.id)} />
                <TextInput
                  mode="flat"
                  dense
                  defaultValue={m.title}
                  underlineColor="transparent"
                  activeUnderlineColor={theme.lineStrong}
                  style={[styles.msInput, m.done && styles.msDone]}
                  onEndEditing={(e) => {
                    const v = e.nativeEvent.text.trim();
                    if (v && v !== m.title) renameMilestone(task.id, m.id, v);
                  }}
                />
                <IconButton icon="close" size={17} onPress={() => deleteMilestone(task.id, m.id)} />
              </View>
            ))
          )}
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              dense
              label="Add a milestone"
              value={msInput}
              onChangeText={setMsInput}
              onSubmitEditing={submitMilestone}
              returnKeyType="done"
              style={styles.flex}
            />
            <IconButton icon="plus" mode="contained" onPress={submitMilestone} />
          </View>

          <Text variant="labelMedium" style={styles.label}>
            Attachments
          </Text>
          <AttachmentsSection
            taskId={task.id}
            attachments={attachments}
            storageUsed={data?.storageUsed || 0}
            currentUserId={userId}
            onAdd={addNote}
            onDelete={deleteNote}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  appBar: { backgroundColor: theme.panel, elevation: 0 },
  appBarTitle: { fontSize: 19, fontWeight: "600" },
  scroll: { padding: 16, gap: 10 },
  title: { backgroundColor: "transparent" },
  titleContent: { fontSize: 21, fontWeight: "600", paddingHorizontal: 0 },
  notesRow: { backgroundColor: theme.panel, borderRadius: 12, paddingRight: 4 },
  label: { color: theme.muted, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 12 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  flex: { flex: 1, backgroundColor: theme.panel },
  hint: { color: theme.ink3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, alignSelf: "center" },
  msRow: { flexDirection: "row", alignItems: "center" },
  msInput: { flex: 1, backgroundColor: "transparent" },
  msDone: { opacity: 0.55 },
});
