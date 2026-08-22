import React from "react";
import { View, Pressable, StyleSheet, Text, Platform } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Hide the "Board" tab from the bottom bar, leaving exactly 4 items
  const routesToRender = state.routes.filter(r => r.name !== "Board");

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.tabBar}>
        {routesToRender.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === state.routes.findIndex(r => r.key === route.key);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          let iconName: keyof typeof Ionicons.glyphMap = "albums-outline";
          let badgeColor = "#3B82F6"; // Default Blue
          let iconColor = isFocused ? theme.ink : theme.ink3;

          if (route.name === "Calendar") iconName = isFocused ? "calendar" : "calendar-outline";
          if (route.name === "Cold") {
            iconName = isFocused ? "snow" : "snow-outline";
            badgeColor = "#0ea5e9"; // Light blue for Cold
          }
          if (route.name === "Research") {
            iconName = "logo-electron"; // Atom-like icon
            iconColor = "#a855f7"; // Purple for research as in screenshot
          }
          if (route.name === "Archive") {
            iconName = isFocused ? "trash" : "trash-outline";
            badgeColor = "#ef4444"; // Red for Bin
          }

          const tab = (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={iconName} size={22} color={iconColor} />
                {options.tabBarBadge && (
                  <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.badgeText}>{options.tabBarBadge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, { color: isFocused ? theme.ink : theme.ink3 }]}>
                {label as string}
              </Text>
            </Pressable>
          );

          // Inject the Add button right after the "Cold" tab (index 1 of filtered routes)
          if (index === 1) {
            return (
              <React.Fragment key={route.key + "_fragment"}>
                {tab}
                <Pressable
                  style={styles.createButton}
                  onPress={() => {
                    // Navigate to Board if not there, or trigger global add
                    navigation.navigate("Board");
                  }}
                >
                  <Ionicons name="add" size={30} color="#000" />
                </Pressable>
              </React.Fragment>
            );
          }

          return tab;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    pointerEvents: "box-none",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: theme.panel,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: theme.lineStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "space-between",
    width: "92%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
    height: 24,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    shadowColor: "#F8FAFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
