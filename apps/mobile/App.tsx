import { useEffect, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ActivityIndicator, PaperProvider } from "react-native-paper";
import { NavigationContainer, DarkTheme, type Theme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { clearSession, loadSession, type Session } from "./src/api";
import BoardScreen from "./src/screens/BoardScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import ArchiveScreen from "./src/screens/ArchiveScreen";
import SignInScreen from "./src/screens/SignInScreen";
import TaskSheetHost from "./src/components/TaskSheetHost";
import WorkspaceHeaderButton from "./src/components/WorkspaceHeaderButton";
import { BoardProvider, useBoard } from "./src/store/BoardContext";
import { paperTheme, theme } from "./src/theme";

const Tab = createBottomTabNavigator();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.bg,
    card: theme.panel,
    text: theme.ink,
    border: theme.line,
    primary: theme.accent,
  },
};

function NavIcon({ focused, on, off }: { focused: boolean; on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.navPill, focused && styles.navPillOn]}>
      <Ionicons
        name={focused ? on : off}
        size={22}
        color={focused ? paperTheme.colors.onSecondaryContainer : theme.ink3}
      />
    </View>
  );
}

import CustomTabBar from "./src/components/CustomTabBar";

function DummyScreen({ name }: { name: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: theme.ink }}>{name} (Coming Soon)</Text>
    </View>
  );
}

function ColdScreenComponent() {
  return <DummyScreen name="Cold Store" />;
}

function ResearchScreenComponent() {
  return <DummyScreen name="Research" />;
}

function Tabs() {
  const { data } = useBoard();

  // Badge on Archive so paused/binned work stays visible without opening the tab.
  const archiveCount =
    (data?.clusters || []).filter((c) => c.status !== "active").length +
    (data?.tasks || []).filter((t) => t.cold || t.binned).length;

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.panel },
        headerTintColor: theme.ink,
        headerTitleStyle: { fontWeight: "600", fontSize: 20 },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Board"
        component={BoardScreen}
        options={{
          tabBarButton: () => null,
          tabBarLabel: "Board",
          headerTitle: "Slow Spider",
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: "Calendar",
        }}
      />
      <Tab.Screen
        name="Cold"
        component={ColdScreenComponent}
        options={{
          title: "Cold",
          tabBarBadge: 3,
        }}
      />
      <Tab.Screen
        name="Research"
        component={ResearchScreenComponent}
        options={{
          title: "Research",
        }}
      />
      <Tab.Screen
        name="Archive"
        component={ArchiveScreen}
        options={{
          title: "Bin",
          tabBarBadge: archiveCount > 0 ? archiveCount : 8,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    loadSession()
      .then(setSession)
      .finally(() => setRestoring(false));
  }, []);

  async function signOut() {
    await clearSession();
    setSession(null);
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <BottomSheetModalProvider>
            <StatusBar style="light" />
            {restoring ? (
              <View style={styles.center}>
                <ActivityIndicator />
              </View>
            ) : session ? (
              <BoardProvider userId={session.userId || ""}>
                <NavigationContainer theme={navTheme}>
                  <Tabs />
                </NavigationContainer>
                {/*
                  Rendered as a sibling *after* the navigator so sheets stack above the tab
                  bar. Deliberately not wrapped in Paper's <Portal>: that teleports children
                  out to the PaperProvider subtree, which would put them outside
                  BoardProvider and break useBoard().
                */}
                <TaskSheetHost onSignOut={signOut} />
              </BoardProvider>
            ) : (
              <SignInScreen onSignedIn={setSession} />
            )}
          </BottomSheetModalProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" },
  navPill: { width: 62, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 2 },
  navPillOn: { backgroundColor: paperTheme.colors.secondaryContainer },
});
