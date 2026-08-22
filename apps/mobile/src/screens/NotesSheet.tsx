import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { displayTitle } from "../helpers";
import { theme } from "../theme";
import { useBoard } from "../store/BoardContext";
import NotesSection from "../components/NotesSection";

/** Dedicated notes surface for a task, reachable from the card chip or the task sheet. */
export default function NotesSheet() {
  const { data, userId, openNotesTaskId, setOpenNotesTaskId, addNote, deleteNote } = useBoard();
  const insets = useSafeAreaInsets();

  const task = data?.tasks.find((t) => t.id === openNotesTaskId) || null;
  if (!task) return null;

  const notes = (data?.notes || []).filter((n) => n.task_id === task.id);
  const close = () => setOpenNotesTaskId(null);

  return (
    // `onRequestClose` is what wires the Android back gesture and back button to dismiss.
    <Modal visible animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.wrap, { paddingTop: insets.top }]}>
        <Appbar.Header style={styles.appBar} statusBarHeight={0}>
          <Appbar.BackAction onPress={close} />
          <Appbar.Content title="Notes" subtitle={displayTitle(task.title) || "Untitled"} titleStyle={styles.title} />
        </Appbar.Header>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="bodySmall" style={styles.blurb}>
            Private notes stay visible only to you, even when this workspace is shared.
          </Text>
          <NotesSection
            parent={{ task_id: task.id, cluster_id: null }}
            notes={notes}
            userId={userId}
            resetKey={task.id}
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
  title: { fontSize: 19, fontWeight: "600" },
  scroll: { padding: 16, gap: 12 },
  blurb: { color: theme.ink3, lineHeight: 17 },
});
