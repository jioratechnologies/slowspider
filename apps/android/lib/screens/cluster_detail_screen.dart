import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_theme.dart';
import '../design/components.dart';
import '../design/tokens.dart';
import '../models/models.dart';
import '../state/auth_provider.dart';
import '../state/board_provider.dart';
import '../widgets/notes_section.dart';

/// Mirrors apps/mobile/src/screens/ClusterSheet.tsx — name/colour/category editor + notes.
class ClusterDetailScreen extends ConsumerStatefulWidget {
  final int clusterId;
  const ClusterDetailScreen({super.key, required this.clusterId});

  @override
  ConsumerState<ClusterDetailScreen> createState() =>
      _ClusterDetailScreenState();
}

class _ClusterDetailScreenState extends ConsumerState<ClusterDetailScreen> {
  final _nameCtrl = TextEditingController();
  bool _initialized = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final board = ref.watch(boardProvider);
    final controller = ref.read(boardProvider.notifier);
    final userId = ref.watch(authProvider).session?.userId ?? '';
    final data = board.data;
    final cluster = data?.clusters
        .where((c) => c.id == widget.clusterId)
        .cast<Cluster?>()
        .firstWhere((_) => true, orElse: () => null);

    if (cluster == null) {
      final p0 = context.ink;
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Text(
            'Cluster not found.',
            style: TextStyle(color: p0.inkFaint),
          ),
        ),
      );
    }
    if (!_initialized) {
      _nameCtrl.text = cluster.name;
      _initialized = true;
    }

    final notes = data!.notes.where((n) => n.clusterId == cluster.id).toList();
    final p = context.ink;

    return Scaffold(
      appBar: AppBar(title: const Text('Edit cluster')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(labelText: 'Name'),
            onSubmitted: (v) {
              final t = v.trim();
              if (t.isNotEmpty && t != cluster.name) {
                controller.patchCluster(cluster.id, {
                  'name': t,
                }, (c) => c.copyWith(name: t));
              }
            },
            onEditingComplete: () {
              final t = _nameCtrl.text.trim();
              if (t.isNotEmpty && t != cluster.name) {
                controller.patchCluster(cluster.id, {
                  'name': t,
                }, (c) => c.copyWith(name: t));
              }
            },
          ),
          const SizedBox(height: 16),
          Text(
            'COLOUR',
            style: TextStyle(
              color: p.inkMuted,
              fontSize: 11,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: clusterColors
                .map(
                  (c) => GestureDetector(
                    onTap: () => controller.patchCluster(cluster.id, {
                      'color': c,
                    }, (x) => x.copyWith(color: c)),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: colorFromHex(c),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: c == cluster.color ? p.ink : Colors.transparent,
                          width: 2.5,
                        ),
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 16),
          Text(
            'CATEGORY',
            style: TextStyle(
              color: p.inkMuted,
              fontSize: 11,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              SpiderPill(
                label: 'None',
                selected: cluster.categoryId == null,
                onTap: () => controller.patchCluster(cluster.id, {
                  'category_id': null,
                }, (c) => c.copyWith(categoryId: null, categoryIdSet: true)),
              ),
              ...data.categories.map(
                (cat) => SpiderPill(
                  label: cat.name,
                  dotColor: colorFromHex(cat.color),
                  selected: cluster.categoryId == cat.id,
                  onTap: () => controller.patchCluster(
                    cluster.id,
                    {'category_id': cat.id},
                    (c) => c.copyWith(categoryId: cat.id, categoryIdSet: true),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'NOTES ON THIS CLUSTER',
            style: TextStyle(
              color: p.inkMuted,
              fontSize: 11,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 10),
          NotesSection(
            parent: NoteParent(clusterId: cluster.id),
            notes: notes,
            userId: userId,
            resetKey: cluster.id,
            onAdd: controller.addNote,
            onDelete: controller.deleteNote,
          ),
        ],
      ),
    );
  }
}
