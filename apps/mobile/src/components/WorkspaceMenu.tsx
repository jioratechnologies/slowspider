import { useState } from "react";
import { Divider, Menu } from "react-native-paper";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBoard } from "../store/BoardContext";
import { theme } from "../theme";

export default function WorkspaceMenu({ anchor }: { anchor: React.ReactNode }) {
  const { data, workspaces, switchWorkspace } = useBoard();
  const [open, setOpen] = useState(false);

  function act(fn: () => void) {
    setOpen(false);
    fn();
  }

  const activeWorkspace = workspaces.find((w) => w.id === data?.workspaceId);

  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={<Pressable onPress={() => setOpen(true)}>{anchor}</Pressable>}
      anchorPosition="bottom"
      contentStyle={styles.menuContent}
    >
      <View style={styles.menuHeader}>
        <Text style={styles.menuLabel}>CURRENT WORKSPACE</Text>
        {activeWorkspace?.role === "owner" && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Owner</Text>
          </View>
        )}
      </View>
      
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Pressable style={styles.manageBtn} onPress={() => act(() => {})}>
          <Ionicons name="people-outline" size={16} color={theme.low} />
          <Text style={styles.manageText}>Manage Collaborators</Text>
        </Pressable>
      </View>

      <Divider style={styles.divider} />

      {workspaces.map((w) => (
        <Menu.Item
          key={w.id}
          style={styles.menuItem}
          titleStyle={styles.menuItemText}
          leadingIcon="office-building"
          title={w.name}
          trailingIcon={w.id === data?.workspaceId ? () => <Ionicons name="checkmark" size={18} color="#2ECC71" style={{ marginRight: 8 }} /> : undefined}
          onPress={() => act(() => switchWorkspace(w.id))}
        />
      ))}

      <Divider style={styles.divider} />
      
      <Menu.Item
        style={styles.menuItem}
        titleStyle={styles.menuItemText}
        leadingIcon="plus"
        title="New workspace"
        onPress={() => act(() => {})}
      />
    </Menu>
  );
}

const styles = StyleSheet.create({
  menuContent: {
    backgroundColor: theme.panel2,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.lineStrong,
    minWidth: 260,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  menuLabel: {
    color: theme.ink3,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  roleBadge: {
    borderWidth: 1,
    borderColor: theme.med + "66",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText: {
    color: theme.med,
    fontSize: 10,
    fontWeight: "700",
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.lineStrong,
    borderRadius: 999,
    paddingVertical: 10,
  },
  manageText: {
    color: theme.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  menuItem: {
    height: 44,
    justifyContent: "center",
  },
  menuItemText: {
    color: theme.ink,
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    backgroundColor: theme.lineStrong,
    marginVertical: 4,
  }
});
