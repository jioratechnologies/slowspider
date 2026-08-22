import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_theme.dart';
import '../core/helpers.dart';
import '../models/models.dart';
import '../state/board_provider.dart';

class ArchiveScreen extends ConsumerStatefulWidget {
  final bool initialBin;
  const ArchiveScreen({super.key, this.initialBin = false});

  @override
  ConsumerState<ArchiveScreen> createState() => _ArchiveScreenState();
}

class _ArchiveScreenState extends ConsumerState<ArchiveScreen> {
  late bool _bin;

  @override
  void initState() {
    super.initState();
    _bin = widget.initialBin;
  }

  @override
  void didUpdateWidget(covariant ArchiveScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialBin != widget.initialBin) {
      _bin = widget.initialBin;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final textColor = theme.colorScheme.onSurface;
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;
    final panelBg = isDark ? theme.cardColor : Colors.white;
    final borderColor = isDark ? theme.dividerColor : AppColors.lightLine;

    final board = ref.watch(boardProvider);
    final controller = ref.read(boardProvider.notifier);
    final data = board.data;

    if (board.loading && data == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final coldClusters = data?.clusters.where((c) => c.status == ClusterStatus.cold).toList() ?? [];
    final coldTasks = data?.tasks.where((t) => t.cold && !t.binned).toList() ?? [];
    final binClusters = data?.clusters.where((c) => c.status == ClusterStatus.binned).toList() ?? [];
    final binTasks = data?.tasks.where((t) => t.binned).toList() ?? [];

    final coldTotal = coldClusters.length + coldTasks.length;
    final binTotal = binClusters.length + binTasks.length;

    String clusterName(int? id) => data?.clusters.where((c) => c.id == id).cast<Cluster?>().firstWhere((_) => true, orElse: () => null)?.name ?? 'Floating';
    int taskCount(int clusterId) => data?.tasks.where((t) => t.clusterId == clusterId).length ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Archive')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: SegmentedButton<bool>(
              segments: [
                ButtonSegment(value: false, label: Text('Cold store ($coldTotal)'), icon: const Icon(Icons.ac_unit)),
                ButtonSegment(value: true, label: Text('Bin ($binTotal)'), icon: const Icon(Icons.delete_outline)),
              ],
              selected: {_bin},
              onSelectionChanged: (s) => setState(() => _bin = s.first),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 110),
              children: _bin
                  ? [
                      Text('Removed for good after 2 weeks.', style: TextStyle(color: ink3Color, fontSize: 12)),
                      const SizedBox(height: 8),
                      if (binTotal == 0) Text('The bin is empty.', style: TextStyle(color: ink3Color, fontStyle: FontStyle.italic)),
                      for (final c in binClusters)
                        _row(
                          context,
                          color: c.color,
                          title: c.name,
                          meta: 'cluster · deletes in ${daysLeft(c.binnedAt)}d',
                          panelBg: panelBg,
                          borderColor: borderColor,
                          textColor: textColor,
                          ink3Color: ink3Color,
                          actions: [
                            _actionBtn(context, 'Restore', Icons.undo, () => controller.patchCluster(c.id, {'status': 'active', 'binned_at': null}, (x) => x.copyWith(status: ClusterStatus.active, binnedAt: null, binnedAtSet: true))),
                            _actionBtn(context, 'Delete now', Icons.close, () => _confirmDelete(context, c.name, () => controller.deleteClusterForever(c.id)), danger: true),
                          ],
                        ),
                      for (final t in binTasks)
                        _row(
                          context,
                          title: displayTitle(t.title).isNotEmpty ? displayTitle(t.title) : 'Untitled',
                          meta: 'task · deletes in ${daysLeft(t.binnedAt)}d',
                          panelBg: panelBg,
                          borderColor: borderColor,
                          textColor: textColor,
                          ink3Color: ink3Color,
                          actions: [
                            _actionBtn(context, 'Restore', Icons.undo, () => controller.patchTask(t.id, {'binned': false, 'binned_at': null}, (x) => x.copyWith(binned: false, binnedAt: null, binnedAtSet: true))),
                            _actionBtn(context, 'Delete now', Icons.close, () => _confirmDelete(context, displayTitle(t.title), () => controller.deleteTaskForever(t.id)), danger: true),
                          ],
                        ),
                    ]
                  : [
                      Text('Paused projects, kept for later.', style: TextStyle(color: ink3Color, fontSize: 12)),
                      const SizedBox(height: 8),
                      if (coldTotal == 0) Text('Nothing paused right now.', style: TextStyle(color: ink3Color, fontStyle: FontStyle.italic)),
                      for (final c in coldClusters)
                        _row(
                          context,
                          color: c.color,
                          title: c.name,
                          meta: '${taskCount(c.id)} tasks',
                          panelBg: panelBg,
                          borderColor: borderColor,
                          textColor: textColor,
                          ink3Color: ink3Color,
                          actions: [
                            _actionBtn(context, 'Resume', Icons.play_arrow, () => controller.patchCluster(c.id, {'status': 'active'}, (x) => x.copyWith(status: ClusterStatus.active))),
                            _actionBtn(context, 'Bin', Icons.delete_outline, () {
                              final now = DateTime.now().toIso8601String();
                              controller.patchCluster(c.id, {'status': 'binned', 'binned_at': now}, (x) => x.copyWith(status: ClusterStatus.binned, binnedAt: now, binnedAtSet: true));
                            }, danger: true),
                          ],
                        ),
                      for (final t in coldTasks)
                        _row(
                          context,
                          title: displayTitle(t.title).isNotEmpty ? displayTitle(t.title) : 'Untitled',
                          meta: 'task · ${clusterName(t.clusterId)}',
                          panelBg: panelBg,
                          borderColor: borderColor,
                          textColor: textColor,
                          ink3Color: ink3Color,
                          actions: [
                            _actionBtn(context, 'Resume', Icons.play_arrow, () => controller.patchTask(t.id, {'cold': false}, (x) => x.copyWith(cold: false))),
                            _actionBtn(context, 'Bin', Icons.delete_outline, () {
                              final now = DateTime.now().toIso8601String();
                              controller.patchTask(t.id, {'binned': true, 'cold': false, 'binned_at': now}, (x) => x.copyWith(binned: true, cold: false, binnedAt: now, binnedAtSet: true));
                            }, danger: true),
                          ],
                        ),
                    ],
            ),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, String title, VoidCallback onConfirm) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.panel : Colors.white,
        title: const Text('Delete permanently?'),
        content: Text('"$title" will be gone for good.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(onPressed: () { Navigator.pop(ctx); onConfirm(); }, child: const Text('Delete', style: TextStyle(color: AppColors.danger))),
        ],
      ),
    );
  }

  Widget _row(
    BuildContext context, {
    String? color,
    required String title,
    required String meta,
    required Color panelBg,
    required Color borderColor,
    required Color textColor,
    required Color ink3Color,
    required List<Widget> actions,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: panelBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: colorFromHex(color ?? '#787D8A'), shape: BoxShape.circle)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: textColor, fontSize: 15, fontWeight: FontWeight.w600)),
              Text(meta, style: TextStyle(color: ink3Color, fontSize: 12)),
            ]),
          ),
        ]),
        Row(mainAxisAlignment: MainAxisAlignment.end, children: actions),
      ]),
    );
  }

  Widget _actionBtn(BuildContext context, String label, IconData icon, VoidCallback onTap, {bool danger = false}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mutedColor = isDark ? AppColors.muted : AppColors.lightMuted;
    return TextButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 16, color: danger ? AppColors.danger : mutedColor),
      label: Text(label, style: TextStyle(color: danger ? AppColors.danger : mutedColor, fontSize: 13)),
    );
  }
}
