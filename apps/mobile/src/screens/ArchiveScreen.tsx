import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, SegmentedButtons, Text } from "react-native-paper";
import { daysLeft, displayTitle } from "../helpers";
import { theme } from "../theme";
import { useBoard } from "../store/BoardContext";

type Tab = "cold" | "bin";

export default function ArchiveScreen() {
  const { data, loading, patchTask, patchCluster, deleteTaskForever, deleteClusterForever } = useBoard();
  const [tab, setTab] = useState<Tab>("cold");

  const cold = useMemo(() => {
    if (!data) return { clusters: [], tasks: [] };
    return { clusters: data.clusters.filter((c) => c.status === "cold"), tasks: data.tasks.filter((t) => t.cold && !t.binned) };
  }, [data]);

  const bin = useMemo(() => {
    if (!data) return { clusters: [], tasks: [] };
    return { clusters: data.clusters.filter((c) => c.status === "binned"), tasks: data.tasks.filter((t) => t.binned) };
  }, [data]);

  const taskCount = (clusterId: number) => (data?.tasks || []).filter((t) => t.cluster_id === clusterId).length;
  const clusterName = (id: number | null) => data?.clusters.find((c) => c.id === id)?.name || "Floating";

  function confirmDelete(title: string, onConfirm: () => void) {
    Alert.alert("Delete permanently?", `"${title}" will be gone for good.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.ink} />
      </View>
    );
  }

  const coldTotal = cold.clusters.length + cold.tasks.length;
  const binTotal = bin.clusters.length + bin.tasks.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.segment}>
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          buttons={[
            { value: "cold", label: `Cold store (${coldTotal})`, icon: "snowflake" },
            { value: "bin", label: `Bin (${binTotal})`, icon: "trash-can-outline" },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "cold" ? (
          <>
            <Text style={styles.hint}>Paused projects, kept for later. Unused ~4 months, they land here automatically.</Text>
            {coldTotal === 0 && <Text style={styles.empty}>Nothing paused right now.</Text>}
            {cold.clusters.map((c) => (
              <Row key={`c${c.id}`} color={c.color} title={c.name} meta={`${taskCount(c.id)} tasks`}>
                <ActionBtn icon="play" label="Resume" onPress={() => patchCluster(c.id, { status: "active" })} />
                <ActionBtn
                  icon="trash-can-outline"
                  label="Bin"
                  danger
                  onPress={() => patchCluster(c.id, { status: "binned", binned_at: new Date().toISOString() })}
                />
              </Row>
            ))}
            {cold.tasks.map((t) => (
              <Row key={`t${t.id}`} title={displayTitle(t.title) || "Untitled"} meta={`task · ${clusterName(t.cluster_id)}`}>
                <ActionBtn icon="play" label="Resume" onPress={() => patchTask(t.id, { cold: false })} />
                <ActionBtn
                  icon="trash-can-outline"
                  label="Bin"
                  danger
                  onPress={() => patchTask(t.id, { binned: true, cold: false, binned_at: new Date().toISOString() })}
                />
              </Row>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.hint}>Removed for good after 2 weeks.</Text>
            {binTotal === 0 && <Text style={styles.empty}>The bin is empty.</Text>}
            {bin.clusters.map((c) => (
              <Row key={`c${c.id}`} color={c.color} title={c.name} meta={`cluster · deletes in ${daysLeft(c.binned_at)}d`}>
                <ActionBtn icon="undo" label="Restore" onPress={() => patchCluster(c.id, { status: "active", binned_at: null })} />
                <ActionBtn icon="close" label="Delete now" danger onPress={() => confirmDelete(c.name, () => deleteClusterForever(c.id))} />
              </Row>
            ))}
            {bin.tasks.map((t) => (
              <Row key={`t${t.id}`} title={displayTitle(t.title) || "Untitled"} meta={`task · deletes in ${daysLeft(t.binned_at)}d`}>
                <ActionBtn icon="undo" label="Restore" onPress={() => patchTask(t.id, { binned: false, binned_at: null })} />
                <ActionBtn
                  icon="close"
                  label="Delete now"
                  danger
                  onPress={() => confirmDelete(displayTitle(t.title) || "Untitled", () => deleteTaskForever(t.id))}
                />
              </Row>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ color, title, meta, children }: { color?: string; title: string; meta: string; children: React.ReactNode }) {
  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={[styles.rowDot, { backgroundColor: color || theme.ink3 }]} />
        <View style={styles.rowBody}>
          <Text variant="bodyLarge" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="bodySmall" style={styles.rowMeta}>
            {meta}
          </Text>
        </View>
      </Card.Content>
      <Card.Actions>{children}</Card.Actions>
    </Card>
  );
}

function ActionBtn({ icon, label, danger, onPress }: { icon: string; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Button mode="text" icon={icon} compact textColor={danger ? theme.danger : theme.muted} onPress={onPress}>
      {label}
    </Button>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" },
  segment: { padding: 16, paddingBottom: 8 },
  scroll: { padding: 16, paddingTop: 8, gap: 10 },
  hint: { color: theme.ink3, fontSize: 12, marginBottom: 4 },
  empty: { color: theme.ink3, fontStyle: "italic", fontSize: 13 },
  card: { backgroundColor: theme.panel },
  cardContent: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 0 },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowBody: { flex: 1, minWidth: 0 },
  rowMeta: { color: theme.ink3, marginTop: 1 },
});
