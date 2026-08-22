import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { CLUSTER_COLORS, theme } from "../theme";
import Sheet from "./Sheet";

export default function CreateClusterModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(CLUSTER_COLORS[0]);

  useEffect(() => {
    if (visible) {
      setName("");
      setColor(CLUSTER_COLORS[0]);
    }
  }, [visible]);

  function submit() {
    const v = name.trim();
    if (!v) return;
    onCreate(v, color);
  }

  return (
    <Sheet visible={visible} onClose={onClose} snapPoints={["44%"]}>
      <Text variant="titleLarge">New cluster</Text>

      <TextInput
        mode="outlined"
        label="Cluster name"
        value={name}
        onChangeText={setName}
        autoFocus
        style={styles.input}
        onSubmitEditing={submit}
      />

      <Text variant="labelMedium" style={styles.label}>
        Colour
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatchRow}>
        {CLUSTER_COLORS.map((c) => (
          <Pressable
            key={c}
            style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchOn]}
            onPress={() => setColor(c)}
          />
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <Button mode="text" onPress={onClose}>
          Cancel
        </Button>
        <Button mode="contained" onPress={submit} disabled={!name.trim()}>
          Create
        </Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: theme.panel },
  label: { color: theme.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  swatchRow: { gap: 12, paddingVertical: 4, paddingRight: 8 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "transparent" },
  swatchOn: { borderColor: theme.ink },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
});
