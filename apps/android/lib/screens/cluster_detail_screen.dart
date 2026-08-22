import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_theme.dart';
import '../models/models.dart';
import '../state/auth_provider.dart';
import '../state/board_provider.dart';
import '../widgets/notes_section.dart';

/// Mirrors apps/mobile/src/screens/ClusterSheet.tsx — name/colour/category editor + notes.
class ClusterDetailScreen extends ConsumerStatefulWidget {
  final int clusterId;
  const ClusterDetailScreen({super.key, required this.clusterId});

  @override
  ConsumerState<ClusterDetailScreen> createState() => _ClusterDetailScreenState();
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
    final cluster = data?.clusters.where((c) => c.id == widget.clusterId).cast<Cluster?>().firstWhere((_) => true, orElse: () => null);

    if (cluster == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: Text('Cluster not found.', style: TextStyle(color: AppColors.ink3))));
    }
    if (!_initialized) {
      _nameCtrl.text = cluster.name;
      _initialized = true;
    }

    final notes = data!.notes.where((n) => n.clusterId == cluster.id).toList();

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
              if (t.isNotEmpty && t != cluster.name) controller.patchCluster(cluster.id, {'name': t}, (c) => c.copyWith(name: t));
            },
            onEditingComplete: () {
              final t = _nameCtrl.text.trim();
              if (t.isNotEmpty && t != cluster.name) controller.patchCluster(cluster.id, {'name': t}, (c) => c.copyWith(name: t));
            },
          ),
          const SizedBox(height: 16),
          const Text('COLOUR', style: TextStyle(color: AppColors.muted, fontSize: 11, letterSpacing: 0.6)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: clusterColors
                .map((c) => GestureDetector(
                      onTap: () => controller.patchCluster(cluster.id, {'color': c}, (x) => x.copyWith(color: c)),
                      child: Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(color: colorFromHex(c), shape: BoxShape.circle, border: Border.all(color: c == cluster.color ? AppColors.ink : Colors.transparent, width: 2)),
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 16),
          const Text('CATEGORY', style: TextStyle(color: AppColors.muted, fontSize: 11, letterSpacing: 0.6)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(label: const Text('None'), selected: cluster.categoryId == null, onSelected: (_) => controller.patchCluster(cluster.id, {'category_id': null}, (c) => c.copyWith(categoryId: null, categoryIdSet: true))),
              ...data.categories.map((cat) => ChoiceChip(
                    label: Text(cat.name),
                    avatar: CircleAvatar(backgroundColor: colorFromHex(cat.color), radius: 6),
                    selected: cluster.categoryId == cat.id,
                    onSelected: (_) => controller.patchCluster(cluster.id, {'category_id': cat.id}, (c) => c.copyWith(categoryId: cat.id, categoryIdSet: true)),
                  )),
            ],
          ),
          const SizedBox(height: 16),
          const Text('NOTES ON THIS CLUSTER', style: TextStyle(color: AppColors.muted, fontSize: 11, letterSpacing: 0.6)),
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
