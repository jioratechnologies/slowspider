import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { displayTitle, googleCalendarUrl, isCalendarSyncable, isoDate, monthGrid, tasksByDate } from "../helpers";
import { theme } from "../theme";
import { useBoard } from "../store/BoardContext";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarScreen() {
  const { data, loading, setOpenTaskId } = useBoard();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(isoDate(today));

  const byDate = useMemo(() => tasksByDate(data?.tasks || [], data?.clusters || []), [data]);
  const grid = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const dayTasks = byDate.get(selected) || [];
  const clusterName = (id: number | null) => (id ? data?.clusters.find((c) => c.id === id)?.name || null : null);

  function shiftMonth(dir: 1 | -1) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.ink} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.scroll}>
      <View style={styles.monthRow}>
        <Pressable style={styles.navBtn} hitSlop={10} onPress={() => shiftMonth(-1)}>
          <Ionicons name="chevron-back" size={20} color={theme.ink} />
        </Pressable>
        <Text style={styles.monthLabel}>{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text>
        <Pressable style={styles.navBtn} hitSlop={10} onPress={() => shiftMonth(1)}>
          <Ionicons name="chevron-forward" size={20} color={theme.ink} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((d) => {
          const key = isoDate(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const count = (byDate.get(key) || []).length;
          const isToday = key === isoDate(today);
          const isSelected = key === selected;
          return (
            <Pressable
              key={key}
              style={[styles.cell, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}
              onPress={() => setSelected(key)}
            >
              <Text style={[styles.cellText, !inMonth && styles.cellTextDim, isSelected && styles.cellTextSelected]}>{d.getDate()}</Text>
              {count > 0 && <View style={[styles.cellDot, isSelected && styles.cellDotSelected]} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.agenda}>
        <Text style={styles.agendaTitle}>
          {new Date(selected + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </Text>
        {!dayTasks.length && <Text style={styles.empty}>Nothing scheduled.</Text>}
        {dayTasks.map((t) => (
          <View key={t.id} style={styles.agendaRow}>
            <Pressable style={styles.agendaBody} onPress={() => setOpenTaskId(t.id)}>
              <Text style={styles.agendaText} numberOfLines={1}>
                {displayTitle(t.title) || "Untitled"}
              </Text>
            </Pressable>
            {t.deadline_time && (
              <View style={styles.timeChip}>
                <Ionicons name="time-outline" size={12} color={theme.ink3} />
                <Text style={styles.timeText}>{t.deadline_time}</Text>
              </View>
            )}
            {isCalendarSyncable(t) && (
              <Pressable style={styles.syncBtn} hitSlop={8} onPress={() => Linking.openURL(googleCalendarUrl(t, clusterName(t.cluster_id)))}>
                <Ionicons name="open-outline" size={16} color={theme.ink3} />
              </Pressable>
            )}
          </View>
        ))}
        {dayTasks.some((t) => !isCalendarSyncable(t)) && (
          <Text style={styles.hint}>Add a time to a task to sync it to Google Calendar.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, gap: 4 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 10 },
  navBtn: { padding: 6 },
  monthLabel: { color: theme.ink, fontSize: 16, fontWeight: "700", minWidth: 160, textAlign: "center" },
  weekRow: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", color: theme.ink3, fontSize: 11, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  cellSelected: { backgroundColor: theme.accent },
  cellToday: { borderWidth: 1, borderColor: theme.lineStrong },
  cellText: { color: theme.ink, fontSize: 13 },
  cellTextDim: { color: theme.ink3, opacity: 0.6 },
  cellTextSelected: { color: theme.accentInk, fontWeight: "700" },
  cellDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.accent, marginTop: 2 },
  cellDotSelected: { backgroundColor: theme.accentInk },
  agenda: { marginTop: 18, gap: 8 },
  agendaTitle: { color: theme.ink, fontSize: 15, fontWeight: "600", marginBottom: 4 },
  empty: { color: theme.ink3, fontStyle: "italic", fontSize: 13 },
  agendaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.panel,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  agendaBody: { flex: 1, minWidth: 0 },
  agendaText: { color: theme.ink, fontSize: 14 },
  timeChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { color: theme.ink3, fontSize: 11.5 },
  syncBtn: { padding: 2 },
  hint: { color: theme.ink3, fontSize: 12, marginTop: 4 },
});
