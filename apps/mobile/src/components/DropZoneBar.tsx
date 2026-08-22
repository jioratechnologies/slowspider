import { Animated, StyleSheet, Text, View } from "react-native";
import { DraxView } from "react-native-drax";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

export type DragPayload = { kind: "task" | "cluster"; id: number };

/**
 * Two drop targets that fade in at the bottom of the Board screen while something is
 * being long-pressed and dragged — the Android launcher "drag an icon to the top to
 * uninstall" pattern, applied to freezing/binning a task or cluster.
 */
export default function DropZoneBar({
  visible,
  onFreeze,
  onBin,
}: {
  visible: boolean;
  onFreeze: (payload: DragPayload) => void;
  onBin: (payload: DragPayload) => void;
}) {
  return (
    <View style={styles.wrap} pointerEvents={visible ? "box-none" : "none"}>
      <Animated.View style={[styles.row, { opacity: visible ? 1 : 0 }]}>
        <Zone icon="snow" label="Freeze" color={theme.low} onDrop={(p) => onFreeze(p)} />
        <Zone icon="trash" label="Bin" color={theme.danger} onDrop={(p) => onBin(p)} />
      </Animated.View>
    </View>
  );
}

function Zone({
  icon,
  label,
  color,
  onDrop,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onDrop: (payload: DragPayload) => void;
}) {
  return (
    <DraxView
      style={styles.zone}
      receivingStyle={[styles.zoneReceiving, { borderColor: color }]}
      receptive
      onReceiveDragDrop={(event) => {
        const payload = event.dragged.payload as DragPayload | undefined;
        if (payload) onDrop(payload);
      }}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.zoneLabel, { color }]}>{label}</Text>
    </DraxView>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingBottom: 14 },
  row: { flexDirection: "row", gap: 12, paddingHorizontal: 16 },
  zone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 140,
    justifyContent: "center",
    backgroundColor: theme.panel,
    borderWidth: 1.5,
    borderColor: theme.lineStrong,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    elevation: 6,
  },
  zoneReceiving: { backgroundColor: theme.panel2, borderWidth: 2 },
  zoneLabel: { fontSize: 13, fontWeight: "700" },
});
