import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../design/typography.dart';
import '../core/app_theme.dart';
import '../design/tokens.dart';
import '../core/helpers.dart';
import '../models/models.dart';
import '../state/board_provider.dart';
import '../design/icons.dart';

enum ArchiveFilter { all, clusters, tasks }

class ArchiveScreen extends ConsumerStatefulWidget {
  final bool initialBin;
  const ArchiveScreen({super.key, this.initialBin = false});

  @override
  ConsumerState<ArchiveScreen> createState() => _ArchiveScreenState();
}

class _ArchiveScreenState extends ConsumerState<ArchiveScreen> {
  late bool _bin;
  ArchiveFilter _filter = ArchiveFilter.all;
  final Set<int> _expandedClusterIds = {};

  @override
  void initState() {
    super.initState();
    _bin = widget.initialBin;
  }

  void _toggleClusterExpand(int clusterId) {
    HapticFeedback.selectionClick();
    setState(() {
      if (_expandedClusterIds.contains(clusterId)) {
        _expandedClusterIds.remove(clusterId);
      } else {
        _expandedClusterIds.add(clusterId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final topBarBg = isDark ? AppColors.bg : AppColors.lightBg;
    final topBarBorder = isDark ? AppColors.line : AppColors.lightLine;
    final cardBg = isDark ? AppColors.panel2 : Colors.white;
    final cardBorder = isDark ? AppColors.panel3 : AppColors.lightLine;
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? AppColors.muted : AppColors.lightMuted;

    final board = ref.watch(boardProvider);
    final controller = ref.read(boardProvider.notifier);
    final data = board.data;

    final coldClusters =
        data?.clusters.where((c) => c.status == ClusterStatus.cold).toList() ??
        [];
    final coldTasks =
        data?.tasks.where((t) => t.cold && !t.binned).toList() ?? [];
    final binClusters =
        data?.clusters
            .where((c) => c.status == ClusterStatus.binned)
            .toList() ??
        [];
    final binTasks = data?.tasks.where((t) => t.binned).toList() ?? [];

    final activeClusters = _bin ? binClusters : coldClusters;
    final activeTasks = _bin ? binTasks : coldTasks;

    final totalCount = activeClusters.length + activeTasks.length;
    final coldTotal = coldClusters.length + coldTasks.length;
    final binTotal = binClusters.length + binTasks.length;

    String clusterName(int? id) =>
        data?.clusters
            .where((c) => c.id == id)
            .cast<Cluster?>()
            .firstWhere((_) => true, orElse: () => null)
            ?.name ??
        'Floating';

    List<Task> getClusterTasks(int clusterId) {
      return data?.tasks.where((t) => t.clusterId == clusterId).toList() ?? [];
    }

    final showClusters =
        _filter == ArchiveFilter.all || _filter == ArchiveFilter.clusters;
    final showTasks =
        _filter == ArchiveFilter.all || _filter == ArchiveFilter.tasks;

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 56,
        backgroundColor: topBarBg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(
          _bin ? 'Dumping Bin' : 'Cold Store',
          style: AppType.sans(
            color: textColor,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: topBarBorder),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 110),
        children: [
          // 1. Custom Segmented Capsule Pill (Cold vs Bin)
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: isDark ? AppColors.panel : AppColors.lightPanel2,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: cardBorder),
            ),
            child: Row(
              children: [
                // Cold Store Segment
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _bin = false),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 160),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: !_bin
                            ? (isDark ? AppColors.panel3 : Colors.white)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: !_bin
                            ? Border.all(
                                color: AppColors.muted.withValues(alpha: 0.35),
                              )
                            : null,
                        boxShadow: !_bin
                            ? [
                                BoxShadow(
                                  color: AppColors.muted.withValues(
                                    alpha: isDark ? 0.15 : 0.05,
                                  ),
                                  blurRadius: 6,
                                ),
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          AppIcon(
                            SpiderIcons.coldStore,
                            size: 15,
                            color: !_bin ? AppColors.muted : mutedColor,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Cold store ($coldTotal)',
                            style: AppType.sans(
                              color: !_bin ? AppColors.muted : mutedColor,
                              fontSize: 12.5,
                              fontWeight: !_bin
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 4),

                // Bin Segment
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _bin = true),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 160),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _bin
                            ? (isDark ? AppColors.panel2 : Colors.white)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: _bin
                            ? Border.all(
                                color: AppColors.danger.withValues(alpha: 0.35),
                              )
                            : null,
                        boxShadow: _bin
                            ? [
                                BoxShadow(
                                  color: AppColors.danger.withValues(
                                    alpha: isDark ? 0.15 : 0.05,
                                  ),
                                  blurRadius: 6,
                                ),
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          AppIcon(
                            SpiderIcons.dumpingBin,
                            size: 15,
                            color: _bin ? AppColors.danger : mutedColor,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Bin ($binTotal)',
                            style: AppType.sans(
                              color: _bin ? AppColors.danger : mutedColor,
                              fontSize: 12.5,
                              fontWeight: _bin
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 2. Info Banner
          if (!_bin)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: isDark ? AppColors.panel : AppColors.lightPanel2,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.muted.withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                children: [
                  const AppIcon(
                    SpiderIcons.coldStore,
                    size: 16,
                    color: AppColors.muted,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Cloud Storage: Zipped & Archived (70% space saved). Items inactive > 4mo auto-archive here.',
                      style: AppType.sans(
                        color: isDark ? AppColors.muted : AppColors.muted,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.danger.withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                children: [
                  const AppIcon(
                    SpiderIcons.dumpingBin,
                    size: 16,
                    color: AppColors.danger,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Removed for good after 14 days. Restore anytime before expiration.',
                      style: AppType.sans(
                        color: isDark ? AppColors.danger : AppColors.danger,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 12),

          // 3. Filter Bar for [ All | Clusters | Tasks ]
          Row(
            children: [
              _filterPill(
                label: 'All',
                count: activeClusters.length + activeTasks.length,
                active: _filter == ArchiveFilter.all,
                isDark: isDark,
                onTap: () => setState(() => _filter = ArchiveFilter.all),
              ),
              const SizedBox(width: 6),
              _filterPill(
                label: 'Clusters',
                count: activeClusters.length,
                active: _filter == ArchiveFilter.clusters,
                isDark: isDark,
                onTap: () => setState(() => _filter = ArchiveFilter.clusters),
              ),
              const SizedBox(width: 6),
              _filterPill(
                label: 'Tasks',
                count: activeTasks.length,
                active: _filter == ArchiveFilter.tasks,
                isDark: isDark,
                onTap: () => setState(() => _filter = ArchiveFilter.tasks),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // 4. Item Lists
          if (totalCount == 0)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: Column(
                  children: [
                    AppIcon(
                      _bin ? SpiderIcons.dumpingBin : SpiderIcons.coldStore,
                      size: 40,
                      color: _bin ? AppColors.danger : AppColors.muted,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _bin ? 'Bin is empty' : 'No cold items',
                      style: AppType.sans(
                        color: textColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _bin
                          ? 'Deleted tasks and clusters will appear here.'
                          : 'Paused projects and frozen tasks appear here.',
                      style: AppType.sans(color: mutedColor, fontSize: 12),
                    ),
                  ],
                ),
              ),
            )
          else ...[
            LayoutBuilder(
              builder: (ctx, constraints) {
                final isTablet = constraints.maxWidth >= 720;
                final colCount = constraints.maxWidth >= 1050
                    ? 3
                    : (isTablet ? 2 : 1);
                final colWidth =
                    (constraints.maxWidth - (colCount - 1) * 10) / colCount;

                final List<Widget> items = [
                  if (showClusters)
                    for (final c in activeClusters)
                      _buildClusterExpandableCard(
                        context: context,
                        cluster: c,
                        clusterTasks: getClusterTasks(c.id),
                        isExpanded: _expandedClusterIds.contains(c.id),
                        onToggleExpand: () => _toggleClusterExpand(c.id),
                        isBin: _bin,
                        cardBg: cardBg,
                        cardBorder: cardBorder,
                        textColor: textColor,
                        mutedColor: mutedColor,
                        isDark: isDark,
                        controller: controller,
                      ),
                  if (showTasks)
                    for (final t in activeTasks)
                      _buildArchiveCard(
                        context: context,
                        title: displayTitle(t.title),
                        subtitle: _bin
                            ? 'task • deletes in ${_calcDaysLeft(t.binnedAt)}'
                            : 'task • ${clusterName(t.clusterId)}',
                        color: _bin ? AppColors.danger : AppColors.muted,
                        isCluster: false,
                        cardBg: cardBg,
                        cardBorder: cardBorder,
                        textColor: textColor,
                        mutedColor: mutedColor,
                        isDark: isDark,
                        primaryLabel: _bin ? 'Restore' : 'Resume',
                        primaryIcon: _bin
                            ? SpiderIcons.restore
                            : SpiderIcons.play,
                        primaryColor: AppColors.muted,
                        onPrimary: () {
                          if (_bin) {
                            controller.patchTask(
                              t.id,
                              {
                                'binned': false,
                                'binned_at': null,
                                'cold': false,
                              },
                              (tt) => tt.copyWith(
                                binned: false,
                                binnedAt: null,
                                binnedAtSet: true,
                                cold: false,
                              ),
                            );
                          } else {
                            controller.patchTask(
                              t.id,
                              {
                                'cold': false,
                                'binned': false,
                                'binned_at': null,
                              },
                              (tt) => tt.copyWith(
                                cold: false,
                                binned: false,
                                binnedAt: null,
                                binnedAtSet: true,
                              ),
                            );
                          }
                        },
                        secondaryLabel: _bin ? 'Delete now' : 'Bin',
                        secondaryIcon: _bin
                            ? SpiderIcons.close
                            : SpiderIcons.delete,
                        secondaryColor: AppColors.danger,
                        onSecondary: () {
                          if (_bin) {
                            controller.deleteTaskForever(t.id);
                          } else {
                            controller.patchTask(
                              t.id,
                              {
                                'binned': true,
                                'binned_at': DateTime.now().toIso8601String(),
                              },
                              (tt) => tt.copyWith(
                                binned: true,
                                binnedAt: DateTime.now().toIso8601String(),
                              ),
                            );
                          }
                        },
                      ),
                ];

                if (isTablet) {
                  return Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    crossAxisAlignment: WrapCrossAlignment.start,
                    children: items
                        .map((w) => SizedBox(width: colWidth, child: w))
                        .toList(),
                  );
                }

                return Column(
                  children: items
                      .map(
                        (w) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: w,
                        ),
                      )
                      .toList(),
                );
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _filterPill({
    required String label,
    required int count,
    required bool active,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        borderRadius: BorderRadius.circular(9),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 140),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: active
                ? (isDark ? AppColors.panel3 : AppColors.lightInk)
                : (isDark
                      ? Colors.white.withValues(alpha: 0.04)
                      : AppColors.lightPanel2),
            borderRadius: BorderRadius.circular(9),
            border: Border.all(
              color: active
                  ? (isDark
                        ? Colors.white.withValues(alpha: 0.16)
                        : Colors.transparent)
                  : (isDark
                        ? Colors.white.withValues(alpha: 0.06)
                        : AppColors.lightLine),
              width: 0.9,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: AppType.sans(
                  color: active
                      ? Colors.white
                      : (isDark ? AppColors.muted : AppColors.lightMuted),
                  fontSize: 12,
                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: active
                      ? (isDark
                            ? Colors.white.withValues(alpha: 0.2)
                            : Colors.white.withValues(alpha: 0.22))
                      : (isDark ? AppColors.panel3 : AppColors.lightLine),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Text(
                  '$count',
                  style: AppType.sans(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: active
                        ? Colors.white
                        : (isDark ? AppColors.muted : AppColors.lightMuted),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildClusterExpandableCard({
    required BuildContext context,
    required Cluster cluster,
    required List<Task> clusterTasks,
    required bool isExpanded,
    required VoidCallback onToggleExpand,
    required bool isBin,
    required Color cardBg,
    required Color cardBorder,
    required Color textColor,
    required Color mutedColor,
    required bool isDark,
    required BoardController controller,
  }) {
    final catColor = colorFromHex(cluster.color);

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.18)
                : Colors.black.withValues(alpha: 0.02),
            blurRadius: 5,
            offset: const Offset(0, 1.5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Cluster Color Dot
                    Container(
                      width: 9,
                      height: 9,
                      decoration: BoxDecoration(
                        color: catColor,
                        borderRadius: BorderRadius.circular(3),
                        boxShadow: [
                          BoxShadow(
                            color: catColor.withValues(alpha: 0.6),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Cluster Title
                    Expanded(
                      child: Text(
                        cluster.name.isNotEmpty
                            ? cluster.name
                            : 'Untitled Cluster',
                        style: AppType.sans(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),

                    // Expand / Collapse Pill Button
                    InkWell(
                      onTap: onToggleExpand,
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.panel3
                              : AppColors.lightPanel2,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isDark
                                ? AppColors.lineStrong
                                : AppColors.lightLine,
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${clusterTasks.length} tasks',
                              style: AppType.sans(
                                color: mutedColor,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 3),
                            AnimatedRotation(
                              turns: isExpanded ? 0.5 : 0.0,
                              duration: const Duration(milliseconds: 180),
                              child: AppIcon(
                                SpiderIcons.chevronDown,
                                size: 15,
                                color: mutedColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Subtitle & Action buttons row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 17),
                      child: Text(
                        isBin
                            ? 'cluster • deletes in ${_calcDaysLeft(cluster.binnedAt)}'
                            : '${clusterTasks.length} tasks archived',
                        style: AppType.sans(color: mutedColor, fontSize: 11.5),
                      ),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Primary Action (Resume / Restore)
                        InkWell(
                          onTap: () {
                            if (isBin) {
                              controller.patchCluster(
                                cluster.id,
                                {'status': 'active', 'binned_at': null},
                                (cc) => cc.copyWith(
                                  status: ClusterStatus.active,
                                  binnedAt: null,
                                  binnedAtSet: true,
                                ),
                              );
                            } else {
                              controller.patchCluster(
                                cluster.id,
                                {'status': 'active'},
                                (cc) =>
                                    cc.copyWith(status: ClusterStatus.active),
                              );
                            }
                          },
                          borderRadius: BorderRadius.circular(7),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.muted.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(7),
                              border: Border.all(
                                color: AppColors.muted.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AppIcon(
                                  isBin
                                      ? SpiderIcons.restore
                                      : SpiderIcons.play,
                                  size: 13,
                                  color: AppColors.muted,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  isBin ? 'Restore' : 'Resume',
                                  style: AppType.sans(
                                    color: AppColors.muted,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),

                        // Secondary Action (Bin / Delete Now)
                        InkWell(
                          onTap: () {
                            if (isBin) {
                              controller.deleteClusterForever(cluster.id);
                            } else {
                              controller.patchCluster(
                                cluster.id,
                                {
                                  'status': 'binned',
                                  'binned_at': DateTime.now().toIso8601String(),
                                },
                                (cc) => cc.copyWith(
                                  status: ClusterStatus.binned,
                                  binnedAt: DateTime.now().toIso8601String(),
                                ),
                              );
                            }
                          },
                          borderRadius: BorderRadius.circular(7),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.danger.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(7),
                              border: Border.all(
                                color: AppColors.danger.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AppIcon(
                                  isBin
                                      ? SpiderIcons.close
                                      : SpiderIcons.delete,
                                  size: 13,
                                  color: AppColors.danger,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  isBin ? 'Delete now' : 'Bin',
                                  style: AppType.sans(
                                    color: AppColors.danger,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Expanded Tasks Section
          if (isExpanded) ...[
            Container(
              height: 1,
              color: isDark ? AppColors.line : AppColors.lightPanel3,
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
              decoration: BoxDecoration(
                color: isDark ? AppColors.panel : AppColors.lightBg,
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(14),
                ),
              ),
              child: clusterTasks.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'No tasks inside this cluster',
                        style: AppType.sans(
                          color: mutedColor,
                          fontSize: 12,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (int i = 0; i < clusterTasks.length; i++) ...[
                          if (i > 0)
                            Divider(
                              height: 12,
                              thickness: 0.8,
                              color: isDark
                                  ? AppColors.panel3
                                  : AppColors.lightPanel2,
                            ),
                          _buildSubTaskRow(
                            task: clusterTasks[i],
                            isBin: isBin,
                            isDark: isDark,
                            textColor: textColor,
                            mutedColor: mutedColor,
                            controller: controller,
                          ),
                        ],
                      ],
                    ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSubTaskRow({
    required Task task,
    required bool isBin,
    required bool isDark,
    required Color textColor,
    required Color mutedColor,
    required BoardController controller,
  }) {
    return Row(
      children: [
        // Task indicator dot
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(
            color: task.done
                ? AppColors.muted
                : (isBin ? AppColors.danger : AppColors.muted),
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),

        // Task Title
        Expanded(
          child: Text(
            displayTitle(task.title),
            style: AppType.sans(
              color: task.done ? mutedColor : textColor,
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              decoration: task.done ? TextDecoration.lineThrough : null,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(width: 8),

        // Quick Subtask Action (Resume / Restore)
        InkWell(
          onTap: () {
            if (isBin) {
              controller.patchTask(
                task.id,
                {'binned': false, 'binned_at': null, 'cold': false},
                (tt) => tt.copyWith(
                  binned: false,
                  binnedAt: null,
                  binnedAtSet: true,
                  cold: false,
                ),
              );
            } else {
              controller.patchTask(
                task.id,
                {'cold': false, 'binned': false, 'binned_at': null},
                (tt) => tt.copyWith(
                  cold: false,
                  binned: false,
                  binnedAt: null,
                  binnedAtSet: true,
                ),
              );
            }
          },
          borderRadius: BorderRadius.circular(6),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
            decoration: BoxDecoration(
              color: AppColors.muted.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              isBin ? 'Restore' : 'Resume',
              style: AppType.sans(
                color: AppColors.muted,
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        const SizedBox(width: 4),

        // Quick Subtask Action (Delete / Bin)
        InkWell(
          onTap: () {
            if (isBin) {
              controller.deleteTaskForever(task.id);
            } else {
              controller.patchTask(
                task.id,
                {'binned': true, 'binned_at': DateTime.now().toIso8601String()},
                (tt) => tt.copyWith(
                  binned: true,
                  binnedAt: DateTime.now().toIso8601String(),
                ),
              );
            }
          },
          borderRadius: BorderRadius.circular(6),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              isBin ? 'Delete' : 'Bin',
              style: AppType.sans(
                color: AppColors.danger,
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ],
    );
  }

  String _calcDaysLeft(String? binnedAtStr) {
    if (binnedAtStr == null) return '14d';
    final dt = DateTime.tryParse(binnedAtStr);
    if (dt == null) return '14d';
    final diff = 14 - DateTime.now().difference(dt).inDays;
    return '${diff.clamp(0, 14)}d';
  }

  Widget _buildArchiveCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required Color color,
    required bool isCluster,
    required Color cardBg,
    required Color cardBorder,
    required Color textColor,
    required Color mutedColor,
    required bool isDark,
    required String primaryLabel,
    required IconData primaryIcon,
    required Color primaryColor,
    required VoidCallback onPrimary,
    required String secondaryLabel,
    required IconData secondaryIcon,
    required Color secondaryColor,
    required VoidCallback onSecondary,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.18)
                : Colors.black.withValues(alpha: 0.02),
            blurRadius: 5,
            offset: const Offset(0, 1.5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Entity Indicator Dot/Square
              Container(
                width: 9,
                height: 9,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(isCluster ? 3 : 999),
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(alpha: 0.6),
                      blurRadius: 4,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Title
              Expanded(
                child: Text(
                  title.isNotEmpty ? title : 'Untitled',
                  style: AppType.sans(
                    color: textColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),

          // Subtitle & Action buttons row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 17),
                child: Text(
                  subtitle,
                  style: AppType.sans(color: mutedColor, fontSize: 11.5),
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Primary Action (Resume / Restore)
                  InkWell(
                    onTap: onPrimary,
                    borderRadius: BorderRadius.circular(7),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: primaryColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(7),
                        border: Border.all(
                          color: primaryColor.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppIcon(primaryIcon, size: 13, color: primaryColor),
                          const SizedBox(width: 4),
                          Text(
                            primaryLabel,
                            style: AppType.sans(
                              color: primaryColor,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),

                  // Secondary Action (Bin / Delete Now)
                  InkWell(
                    onTap: onSecondary,
                    borderRadius: BorderRadius.circular(7),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: secondaryColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(7),
                        border: Border.all(
                          color: secondaryColor.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppIcon(
                            secondaryIcon,
                            size: 13,
                            color: secondaryColor,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            secondaryLabel,
                            style: AppType.sans(
                              color: secondaryColor,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
