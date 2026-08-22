import { useState } from "react";
import { Divider, Menu } from "react-native-paper";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useBoard } from "../store/BoardContext";
import { theme } from "../theme";

export default function BoardMenu({
  onNewCluster,
  onManageWorkspaces,
}: {
  onNewCluster: () => void;
  onManageWorkspaces: () => void;
}) {
  const { sortMode, toggleSortMode, refresh } = useBoard();
  const [open, setOpen] = useState(false);

  function act(fn: () => void) {
    setOpen(false);
    fn();
  }

  const anchor = (
    <Pressable style={styles.avatar} onPress={() => setOpen(true)}>
      <Text style={styles.avatarText}>GA</Text>
    </Pressable>
  );

  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={anchor}
      anchorPosition="bottom"
      contentStyle={{ backgroundColor: theme.panel2, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: theme.lineStrong }}
    >
      <View style={styles.menuHeader}>
        <Text style={styles.menuLabel}>SIGNED IN AS</Text>
        <Text style={styles.menuEmail}>gaurav@gmail.com</Text>
      </View>
      <Divider style={styles.divider} />
      
      <Menu.Item style={styles.menuItem} titleStyle={styles.menuItemText} leadingIcon="moon-waning-crescent" title="Theme: Dark" onPress={() => act(() => {})} />
      <Menu.Item style={styles.menuItem} titleStyle={styles.menuItemText} leadingIcon="plus-circle-outline" title="New Cluster" onPress={() => act(onNewCluster)} />
      <Menu.Item
        style={styles.menuItem}
        titleStyle={styles.menuItemText}
        leadingIcon={sortMode === "smart" ? "auto-fix" : "sort"}
        title={sortMode === "smart" ? "Task Sort: Smart" : "Task Sort: Manual"}
        onPress={() => act(toggleSortMode)}
      />
      <Menu.Item style={styles.menuItem} titleStyle={styles.menuItemText} leadingIcon="download-outline" title="Install app" onPress={() => act(() => {})} />
      
      <Divider style={styles.divider} />
      <View style={styles.menuHeader}><Text style={styles.menuLabel}>PREFERENCES</Text></View>
      <Menu.Item style={styles.menuItem} titleStyle={styles.menuItemText} leadingIcon="bell-outline" title="Browser reminders" trailingIcon={() => <Text style={{color: theme.ink3, fontSize: 12, paddingRight: 8}}>Off</Text>} onPress={() => act(() => {})} />
      
      <Divider style={styles.divider} />
      <View style={styles.menuHeader}><Text style={styles.menuLabel}>ORGANIZE</Text></View>
      <Menu.Item style={styles.menuItem} titleStyle={styles.menuItemText} leadingIcon="tag-outline" title="Manage categories..." onPress={() => act(() => {})} />
      <Menu.Item style={styles.menuItem} titleStyle={styles.menuItemText} leadingIcon="office-building" title="Workspaces" onPress={() => act(onManageWorkspaces)} />
      
      <Divider style={styles.divider} />
      <View style={styles.menuHeader}><Text style={styles.menuLabel}>YOUR DATA</Text></View>
      <Menu.Item style={styles.menuItem} titleStyle={styles.menuItemText} leadingIcon="export" title="Export backup (JSON)" onPress={() => act(() => {})} />
      <Menu.Item style={styles.menuItem} titleStyle={styles.menuItemText} leadingIcon="import" title="Import backup (JSON)" onPress={() => act(() => {})} />
      <Menu.Item style={styles.menuItem} titleStyle={styles.menuItemText} leadingIcon="calendar-export" title="Add deadlines to calendar" onPress={() => act(() => {})} />
      
      <Divider style={styles.divider} />
      <Menu.Item style={styles.menuItem} titleStyle={{ color: theme.danger, fontSize: 14 }} leadingIcon="logout" title="Sign out" onPress={() => act(() => {})} />
    </Menu>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.panel2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.lineStrong,
  },
  avatarText: {
    color: theme.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  menuLabel: {
    color: theme.ink3,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  menuEmail: {
    color: theme.ink,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  menuItem: {
    height: 38,
    justifyContent: "center",
  },
  menuItemText: {
    color: theme.ink,
    fontSize: 14,
  },
  divider: {
    backgroundColor: theme.lineStrong,
    marginVertical: 4,
  }
});
