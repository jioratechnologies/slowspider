import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Chip, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CLUSTER_COLORS, theme } from "../theme";
import { useBoard } from "../store/BoardContext";
import NotesSection from "../components/NotesSection";

export default function ClusterSheet({ clusterId, onClose }: { clusterId: number | null; onClose: () => void }) {
  const { data, userId, patchCluster, addNote, deleteNote } = useBoard();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const cluster = clusterId != null ? data?.clusters.find((c) => c.id === clusterId) || null : null;
  if (!cluster) return null;

  const notes = (data?.notes || []).filter((n) => n.cluster_id === cluster.id);
  const name = nameDraft ?? cluster.name;

  function commitName() {
    const v = (nameDraft ?? "").trim();
    if (v && v !== cluster!.name) patchCluster(cluster!.id, { name: v });
    setNameDraft(null);
  }

  return (
    // `onRequestClose` is what wires the Android back gesture and back button to dismiss.
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.wrap, { paddingTop: insets.top }]}>
        <Appbar.Header style={styles.appBar} statusBarHeight={0}>
          <Appbar.BackAction onPress={onClose} />
          <Appbar.Content title="Edit cluster" titleStyle={styles.appBarTitle} />
        </Appbar.Header>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            mode="outlined"
            label="Name"
            value={name}
            onChangeText={setNameDraft}
            onBlur={commitName}
            onSubmitEditing={commitName}
            style={styles.input}
          />

          <Text variant="labelMedium" style={styles.label}>
            Colour
          </Text>
          <View style={styles.swatchRow}>
            {CLUSTER_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[styles.swatch, { backgroundColor: c }, c === cluster.color && styles.swatchOn]}
                onPress={() => patchCluster(cluster.id, { color: c })}
              />
            ))}
          </View>

          <Text variant="labelMedium" style={styles.label}>
            Category
          </Text>
          <View style={styles.chips}>
            <Chip
              selected={cluster.category_id === null}
              showSelectedCheck={false}
              onPress={() => patchCluster(cluster.id, { category_id: null })}
            >
              None
            </Chip>
            {(data?.categories || []).map((cat) => (
              <Chip
                key={cat.id}
                selected={cluster.category_id === cat.id}
                showSelectedCheck={false}
                onPress={() => patchCluster(cluster.id, { category_id: cat.id })}
                avatar={<View style={[styles.dot, { backgroundColor: cat.color }]} />}
              >
                {cat.name}
              </Chip>
            ))}
          </View>
          <Text variant="bodySmall" style={styles.hint}>
            Categories themselves are managed on the desktop app.
          </Text>

          <Text variant="labelMedium" style={styles.label}>
            Notes on this cluster
          </Text>
          <NotesSection
            parent={{ task_id: null, cluster_id: cluster.id }}
            notes={notes}
            userId={userId}
            resetKey={cluster.id}
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
  input: { backgroundColor: theme.panel },
  label: { color: theme.muted, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 12 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "transparent" },
  swatchOn: { borderColor: theme.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, alignSelf: "center" },
  hint: { color: theme.ink3 },
});
