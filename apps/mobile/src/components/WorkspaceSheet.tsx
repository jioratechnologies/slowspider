import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Divider, IconButton, List, Text, TextInput } from "react-native-paper";
import type { RemoteWorkspace } from "../api";
import { theme } from "../theme";
import Sheet from "./Sheet";

export default function WorkspaceSheet({
  visible,
  workspaces,
  loading,
  currentId,
  onClose,
  onSwitch,
  onCreate,
  onRename,
  onSignOut,
}: {
  visible: boolean;
  workspaces: RemoteWorkspace[];
  loading: boolean;
  currentId: number | null;
  onClose: () => void;
  onSwitch: (id: number) => void;
  onCreate: (name: string) => void;
  onRename: (id: number, name: string) => void;
  onSignOut: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function submitCreate() {
    const v = newName.trim();
    if (!v) return;
    onCreate(v);
    setNewName("");
    setCreating(false);
  }

  function submitRename(id: number) {
    const v = renameValue.trim();
    if (!v) return;
    onRename(id, v);
    setRenamingId(null);
  }

  return (
    <Sheet visible={visible} onClose={onClose} snapPoints={["58%"]}>
      <Text variant="titleLarge">Workspaces</Text>

      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <View>
          {workspaces.map((w) =>
            renamingId === w.id ? (
              <View key={w.id} style={styles.renameRow}>
                <TextInput
                  mode="outlined"
                  dense
                  value={renameValue}
                  onChangeText={setRenameValue}
                  autoFocus
                  style={styles.renameInput}
                  onSubmitEditing={() => submitRename(w.id)}
                />
                <IconButton icon="check" onPress={() => submitRename(w.id)} />
              </View>
            ) : (
              <List.Item
                key={w.id}
                title={w.name}
                titleStyle={styles.itemTitle}
                left={(p) => <List.Icon {...p} icon={w.role === "owner" ? "office-building" : "account-group"} />}
                right={(p) => (
                  <View style={styles.rightRow}>
                    {w.id === currentId && <List.Icon {...p} icon="check" color={theme.accent} />}
                    {w.role === "owner" && (
                      <IconButton
                        icon="pencil"
                        size={17}
                        onPress={() => {
                          setRenamingId(w.id);
                          setRenameValue(w.name);
                        }}
                      />
                    )}
                  </View>
                )}
                onPress={() => onSwitch(w.id)}
              />
            )
          )}
        </View>
      )}

      {creating ? (
        <View style={styles.renameRow}>
          <TextInput
            mode="outlined"
            dense
            label="Workspace name"
            value={newName}
            onChangeText={setNewName}
            autoFocus
            style={styles.renameInput}
            onSubmitEditing={submitCreate}
          />
          <IconButton icon="check" onPress={submitCreate} />
        </View>
      ) : (
        <Button mode="outlined" icon="plus" onPress={() => setCreating(true)}>
          New workspace
        </Button>
      )}

      <Divider style={styles.divider} />
      <Button mode="text" icon="logout" textColor={theme.danger} onPress={onSignOut}>
        Sign out
      </Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  spinner: { paddingVertical: 24 },
  itemTitle: { fontSize: 15 },
  rightRow: { flexDirection: "row", alignItems: "center" },
  renameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  renameInput: { flex: 1, backgroundColor: theme.panel },
  divider: { marginTop: 4 },
});
