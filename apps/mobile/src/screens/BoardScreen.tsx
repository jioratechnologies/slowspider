import { useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator as PaperSpinner, Chip, FAB, IconButton, Searchbar, Text as PaperText } from "react-native-paper";
import { DraxProvider, DraxScrollView, DraxView } from "react-native-drax";
import type { RemoteCluster, RemoteTask } from "../api";
import { isAttachment, isTextNote } from "../api";
import { clusterProgress, displayTitle, isClusterActive, isTaskLive, sortTasks } from "../helpers";
import { theme } from "../theme";
import { useBoard } from "../store/BoardContext";
import TaskCard from "../components/TaskCard";
import QuickCaptureSheet from "../components/QuickCaptureSheet";
import DropZoneBar, { type DragPayload } from "../components/DropZoneBar";
import ClusterSheet from "./ClusterSheet";
import CreateClusterModal from "../components/CreateClusterModal";
import BoardMenu from "../components/BoardMenu";
import WorkspaceMenu from "../components/WorkspaceMenu";
import Svg, { G, Path, Circle } from "react-native-svg";

export default function BoardScreen() {
  const navigation = useNavigation();
  const {
    data,
    workspaces,
    loading,
    refreshing,
    error,
    refresh,
    patchTask,
    moveTask,
    patchCluster,
    createCluster,
    setOpenTaskId,
    setOpenNotesTaskId,
    setWorkspaceSheetOpen,
    sortMode,
  } = useBoard();

  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [captureOpen, setCaptureOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClusterId, setEditingClusterId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const workspaceName = workspaces.find((w) => w.id === data?.workspaceId)?.name;

  useLayoutEffect(() => {
    if (searchOpen) {
      navigation.setOptions({
        headerTitle: () => (
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search tasks, notes, clusters..."
            placeholderTextColor={theme.ink3}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        ),
        headerLeft: () => (
          <IconButton
            icon="arrow-left"
            iconColor={theme.ink3}
            size={22}
            onPress={() => {
              setSearchOpen(false);
              setSearch("");
            }}
          />
        ),
        headerRight: () => null,
      });
    } else {
      navigation.setOptions({
        headerTitle: "",
        headerLeft: () => (
          <View style={styles.headerLeftContainer}>
            <View style={styles.logoSvgWrap}>
              <Svg width="16" height="16" viewBox="0 0 143 100" fill="none">
                <G stroke={theme.ink} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M8 91 54 8 100 91" />
                  <Path d="M43 91 89 8 135 91" />
                </G>
                <Circle cx="71.5" cy="87" r="11.5" fill="#FBBF24" />
              </Svg>
            </View>
            <WorkspaceMenu
              anchor={
                <View style={styles.workspacePill}>
                  <Ionicons name="business-outline" size={16} color={theme.ink3} />
                  <Text style={styles.workspaceText} numberOfLines={1}>{workspaceName || "My Workspace"}</Text>
                  <Ionicons name="chevron-expand" size={14} color={theme.ink3} />
                </View>
              }
            />
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerActions}>
            <Pressable style={styles.iconCircle} onPress={() => setSearchOpen(true)}>
              <Ionicons name="search" size={16} color={theme.ink3} />
            </Pressable>
            <Pressable style={styles.iconCircle}>
              <Ionicons name="notifications-outline" size={16} color={theme.ink3} />
            </Pressable>
            <BoardMenu onNewCluster={() => setCreateOpen(true)} onManageWorkspaces={() => setWorkspaceSheetOpen(true)} />
          </View>
        ),
      });
    }
  }, [navigation, searchOpen, search, workspaceName, setWorkspaceSheetOpen]);

  const liveTasks = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const matches = (t: RemoteTask) => !q || displayTitle(t.title).toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q);
    return data.tasks.filter((t) => isTaskLive(t, data.clusters) && matches(t));
  }, [data, search]);

  const groups = useMemo(() => {
    if (!data) return [];
    const active = data.clusters.filter(isClusterActive).filter((c) => !activeCategory || c.category_id === activeCategory);

    return [
      {
        id: null as number | null,
        name: "Floating",
        color: theme.ink3,
        cluster: null as RemoteCluster | null,
        tasks: sortTasks(liveTasks.filter((t) => t.cluster_id === null), sortMode),
      },
      ...active.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        cluster: c,
        tasks: sortTasks(liveTasks.filter((t) => t.cluster_id === c.id), sortMode),
      })),
    ];
  }, [data, liveTasks, activeCategory, sortMode]);

  function notesFor(taskId: number) {
    return (data?.notes || []).filter((n) => n.task_id === taskId);
  }

  function freezePayload(p: DragPayload) {
    if (p.kind === "task") patchTask(p.id, { cold: true });
    else patchCluster(p.id, { status: "cold" });
  }
  function binPayload(p: DragPayload) {
    const now = new Date().toISOString();
    if (p.kind === "task") patchTask(p.id, { binned: true, cold: false, binned_at: now });
    else patchCluster(p.id, { status: "binned", binned_at: now });
  }

  function clusterMenu(cluster: RemoteCluster) {
    Alert.alert(cluster.name, undefined, [
      { text: "Edit name, colour, notes", onPress: () => setEditingClusterId(cluster.id) },
      { text: "Pause → Cold store", onPress: () => patchCluster(cluster.id, { status: "cold" }) },
      {
        text: "Move to Dumping bin",
        style: "destructive",
        onPress: () => patchCluster(cluster.id, { status: "binned", binned_at: new Date().toISOString() }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <PaperSpinner />
      </View>
    );
  }

  return (
    <DraxProvider onDragStart={() => setDragging(true)} onDragEnd={() => setDragging(false)}>
      <View style={styles.wrap}>
        <DraxScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.muted} onRefresh={refresh} />}
        >
          {/* Quick Capture Input */}
          <Pressable style={styles.quickCaptureInput} onPress={() => setCaptureOpen(true)}>
            <Ionicons name="mic-outline" size={18} color={theme.ink3} />
            <Ionicons name="attach-outline" size={18} color={theme.ink3} />
            <Text style={styles.quickCaptureText}>Add a task and press Enter...</Text>
          </Pressable>

          {data && data.categories.length > 0 && (
            <View style={styles.filterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                <FilterChip 
                  label="All" 
                  isAll={true} 
                  count={liveTasks.length} 
                  active={activeCategory === null} 
                  onPress={() => setActiveCategory(null)} 
                />
                {data.categories.map((c) => (
                  <FilterChip
                    key={c.id}
                    label={c.name}
                    color={c.color}
                    count={liveTasks.filter((t) => c.clusters?.includes(t.cluster_id || -1)).length} 
                    active={activeCategory === c.id}
                    onPress={() => setActiveCategory(c.id)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}


          {groups.map((g) => {
            const key = String(g.id);
            const isCollapsed = collapsed[key];
            const progress = g.id != null ? clusterProgress(g.id, data?.tasks || []) : null;
            const openCount = g.tasks.filter((t) => !t.done).length;

            return (
              <DraxView
                key={key}
                style={styles.section}
                receivingStyle={styles.sectionReceiving}
                receptive
                onReceiveDragDrop={(event) => {
                  const p = event.dragged.payload as DragPayload | undefined;
                  // Only tasks move between clusters; a dragged cluster dropped on another
                  // cluster has no meaning, so it's ignored rather than silently nested.
                  if (p?.kind === "task") moveTask(p.id, g.id);
                }}
              >
                <SectionHeader
                  name={g.name}
                  color={g.color}
                  count={openCount}
                  pct={progress && progress.total > 0 ? progress.pct : null}
                  collapsed={!!isCollapsed}
                  draggable={!!g.cluster}
                  clusterId={g.cluster?.id}
                  onToggle={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
                  onMenu={g.cluster ? () => clusterMenu(g.cluster!) : undefined}
                />

                {!isCollapsed && (
                  <View style={styles.taskList}>
                    {g.tasks.length === 0 ? (
                      <Text style={styles.empty}>{search ? "No matches here." : "Nothing here — drag a task in, or tap +."}</Text>
                    ) : (
                      g.tasks.map((t) => {
                        const notes = notesFor(t.id);
                        return (
                          <DraxView
                            key={t.id}
                            draggable
                            longPressDelay={220}
                            dragPayload={{ kind: "task", id: t.id } satisfies DragPayload}
                            draggingStyle={styles.dragging}
                            renderHoverContent={() => <HoverChip color={g.color} title={displayTitle(t.title) || "Untitled"} />}
                          >
                            <TaskCard
                              task={t}
                              noteCount={notes.filter((n) => isTextNote(n.kind)).length}
                              attachments={notes.filter((n) => isAttachment(n.kind))}
                              onToggle={() => patchTask(t.id, { done: !t.done })}
                              onStar={() => patchTask(t.id, { starred: !t.starred })}
                              onOpen={() => setOpenTaskId(t.id)}
                              onNotes={() => setOpenNotesTaskId(t.id)}
                            />
                          </DraxView>
                        );
                      })
                    )}
                  </View>
                )}
              </DraxView>
            );
          })}

          <Pressable style={styles.addCluster} onPress={() => setCreateOpen(true)}>
            <Ionicons name="add" size={17} color={theme.muted} />
            <PaperText variant="labelLarge" style={styles.addClusterText}>
              New cluster
            </PaperText>
          </Pressable>
          <View style={styles.bottomPad} />
        </DraxScrollView>

        {!dragging && <FAB icon="plus" style={styles.fab} onPress={() => setCaptureOpen(true)} />}

        <DropZoneBar visible={dragging} onFreeze={freezePayload} onBin={binPayload} />

        <QuickCaptureSheet visible={captureOpen} defaultClusterId={null} onClose={() => setCaptureOpen(false)} />
        <CreateClusterModal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={(name, color) => {
            setCreateOpen(false);
            createCluster({ name, color, category_id: activeCategory });
          }}
        />
        <ClusterSheet clusterId={editingClusterId} onClose={() => setEditingClusterId(null)} />
      </View>
    </DraxProvider>
  );
}

function SectionHeader({
  name,
  color,
  count,
  pct,
  collapsed,
  draggable,
  clusterId,
  onToggle,
  onMenu,
}: {
  name: string;
  color: string;
  count: number;
  pct: number | null;
  collapsed: boolean;
  draggable: boolean;
  clusterId?: number;
  onToggle: () => void;
  onMenu?: () => void;
}) {
  if (name === "Floating") {
    return (
      <View style={styles.floatingHeaderWrap}>
        <View style={styles.floatingHeaderMain}>
          <Ionicons name="albums-outline" size={18} color={theme.ink} />
          <Text style={styles.floatingHeaderTitle}>Floating</Text>
          <Text style={styles.floatingHeaderDesc}>Unsorted tasks — drag into a cluster when ready.</Text>
        </View>
        <Pressable style={styles.pinBtn}>
          <Ionicons name="pin-outline" size={12} color={theme.muted} />
          <Text style={styles.pinBtnText}>Pin on scroll</Text>
        </Pressable>
      </View>
    );
  }

  const inner = (
    <View style={styles.sectionHeadWrap}>
      <View style={styles.sectionHead}>
        <Pressable style={styles.sectionHeadMain} onPress={onToggle}>
          <Ionicons name="grid" size={16} color={theme.ink3} />
          <View style={[styles.sectionDot, { backgroundColor: color }]} />
          <Text style={styles.sectionName} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{count}</Text>
          </View>
        </Pressable>
        {onMenu && (
          <Pressable style={styles.sectionMenu} hitSlop={8} onPress={onMenu}>
            <Ionicons name="ellipsis-horizontal" size={16} color={theme.ink3} />
          </Pressable>
        )}
      </View>
      {pct !== null && (
        <View style={styles.headProgressTrack}>
          <View style={[styles.headProgressFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      )}
    </View>
  );

  if (!draggable || clusterId == null) return inner;

  return (
    <DraxView
      draggable
      longPressDelay={220}
      dragPayload={{ kind: "cluster", id: clusterId } satisfies DragPayload}
      draggingStyle={styles.dragging}
      renderHoverContent={() => <HoverChip color={color} title={name} />}
    >
      {inner}
    </DraxView>
  );
}

function HoverChip({ color, title }: { color: string; title: string }) {
  return (
    <View style={styles.hoverChip}>
      <View style={[styles.hoverDot, { backgroundColor: color }]} />
      <Text style={styles.hoverText} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

function FilterChip({ label, color, active, onPress, count, isAll }: { label: string; color?: string; active: boolean; onPress: () => void; count?: number; isAll?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        active && styles.filterChipActive
      ]}
    >
      {isAll && <Ionicons name="options-outline" size={14} color={active ? theme.bg : theme.muted} style={{marginRight: 2}} />}
      {color && <View style={[styles.filterDot, { backgroundColor: color }]} />}
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
      {count !== undefined && (
        <View style={[styles.filterCountBadge, active && styles.filterCountBadgeActive]}>
          <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" },
  headerLeftContainer: { flexDirection: "row", alignItems: "center", marginLeft: 16, gap: 8 },
  logoSvgWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: "transparent", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.lineStrong },
  brandText: { color: theme.ink, fontSize: 16, fontWeight: "600", fontFamily: "serif" },
  headerDivider: { width: 1, height: 16, backgroundColor: theme.lineStrong, marginHorizontal: 4 },
  workspacePill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "transparent", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.lineStrong, maxWidth: 160 },
  workspaceText: { color: theme.ink, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  peopleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "transparent", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.lineStrong },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10, marginRight: 16 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "transparent", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.lineStrong },
  headerSearchInput: { flex: 1, fontSize: 16, color: theme.ink, width: Dimensions.get("window").width - 80 },
  // Explicit height: a horizontal ScrollView in a column parent otherwise collapses to a
  // sliver, which is what clipped this row before.
  filterBar: { height: 48, justifyContent: "center", marginBottom: 12 },
  filterContent: { paddingHorizontal: 0, gap: 8, alignItems: "center" },
  filterChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.lineStrong, backgroundColor: "transparent", gap: 6 },
  filterChipActive: { backgroundColor: theme.ink, borderColor: theme.ink },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterChipText: { color: theme.muted, fontSize: 13, fontWeight: "500" },
  filterChipTextActive: { color: theme.bg, fontWeight: "600" },
  filterCountBadge: { backgroundColor: theme.panel2, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  filterCountBadgeActive: { backgroundColor: theme.bg + "44" },
  filterCountText: { color: theme.muted, fontSize: 10, fontWeight: "600" },
  filterCountTextActive: { color: theme.bg },
  error: { color: theme.danger, fontSize: 13, paddingHorizontal: 16, paddingVertical: 6 },
  scroll: { padding: 14, paddingTop: 6, gap: 16 },
  quickCaptureInput: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  quickCaptureText: { color: theme.ink3, fontSize: 15, flex: 1 },
  section: { borderRadius: 18, borderWidth: 1, borderColor: "transparent" },
  sectionReceiving: { borderColor: theme.accent, backgroundColor: theme.panel + "55" },
  sectionHeadWrap: { marginBottom: 12 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  sectionHeadMain: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionName: { color: theme.ink, fontSize: 17, fontWeight: "700", flexShrink: 1 },
  countPill: { backgroundColor: theme.panel2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countPillText: { color: theme.muted, fontSize: 11, fontWeight: "600" },
  headProgressTrack: { width: "100%", height: 3, borderRadius: 1.5, backgroundColor: theme.panel2, overflow: "hidden", marginTop: 8 },
  headProgressFill: { height: "100%", borderRadius: 1.5 },
  sectionMenu: { padding: 4 },
  floatingHeaderWrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingVertical: 12, marginBottom: 8 },
  floatingHeaderMain: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  floatingHeaderTitle: { color: theme.ink, fontSize: 16, fontWeight: "700" },
  floatingHeaderDesc: { color: theme.ink3, fontSize: 12, flexShrink: 1 },
  pinBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pinBtnText: { color: theme.muted, fontSize: 11 },
  taskList: { gap: 8, paddingBottom: 4 },
  empty: { color: theme.ink3, fontSize: 12.5, fontStyle: "italic", paddingVertical: 6, paddingHorizontal: 4 },
  dragging: { opacity: 0.3 },
  hoverChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 250,
    backgroundColor: theme.panel2,
    borderWidth: 1,
    borderColor: theme.lineStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    elevation: 10,
  },
  hoverDot: { width: 10, height: 10, borderRadius: 3 },
  hoverText: { color: theme.ink, fontSize: 13.5, fontWeight: "600", flexShrink: 1 },
  addCluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.lineStrong,
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 2,
  },
  addClusterText: { color: theme.muted },
  bottomPad: { height: 88 },
  fab: { position: "absolute", right: 16, bottom: 16, display: "none" },
});
