import 'package:flutter/material.dart';

import '../core/app_theme.dart';

/// Mirrors apps/mobile/src/components/CreateClusterModal.tsx.
Future<void> showCreateClusterSheet(BuildContext context, {required void Function(String name, String color) onCreate}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.panel,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (ctx) => _CreateClusterSheet(onCreate: onCreate),
  );
}

class _CreateClusterSheet extends StatefulWidget {
  final void Function(String name, String color) onCreate;
  const _CreateClusterSheet({required this.onCreate});

  @override
  State<_CreateClusterSheet> createState() => _CreateClusterSheetState();
}

class _CreateClusterSheetState extends State<_CreateClusterSheet> {
  final _nameCtrl = TextEditingController();
  String _color = clusterColors.first;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    final v = _nameCtrl.text.trim();
    if (v.isEmpty) return;
    widget.onCreate(v, _color);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.lineStrong, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 14),
            const Text('New cluster', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.ink)),
            const SizedBox(height: 12),
            TextField(
              controller: _nameCtrl,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'Cluster name'),
              onSubmitted: (_) => _submit(),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            const Text('COLOUR', style: TextStyle(color: AppColors.muted, fontSize: 11, letterSpacing: 0.6)),
            const SizedBox(height: 10),
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: clusterColors
                    .map((c) => Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: GestureDetector(
                            onTap: () => setState(() => _color = c),
                            child: Container(
                              width: 34,
                              height: 34,
                              decoration: BoxDecoration(
                                color: colorFromHex(c),
                                shape: BoxShape.circle,
                                border: Border.all(color: c == _color ? AppColors.ink : Colors.transparent, width: 2),
                              ),
                            ),
                          ),
                        ))
                    .toList(),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
                const SizedBox(width: 8),
                ElevatedButton(onPressed: _nameCtrl.text.trim().isEmpty ? null : _submit, child: const Text('Create')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
