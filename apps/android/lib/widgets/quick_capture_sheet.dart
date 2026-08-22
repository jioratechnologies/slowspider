import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/app_theme.dart';
import '../core/upload_helper.dart';
import '../models/models.dart';
import '../state/board_provider.dart';
import 'voice_recorder.dart';
import 'dart:io';

Future<void> showQuickCaptureSheet(BuildContext context, {int? defaultClusterId}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: const Color(0xFF191A22),
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => _QuickCaptureSheet(defaultClusterId: defaultClusterId),
  );
}

class _QuickCaptureSheet extends ConsumerStatefulWidget {
  final int? defaultClusterId;
  const _QuickCaptureSheet({this.defaultClusterId});

  @override
  ConsumerState<_QuickCaptureSheet> createState() => _QuickCaptureSheetState();
}

class _StagedFile {
  final PickedFile? picked;
  final String? voicePath;
  final int? durationMs;
  final String name;
  final String mime;
  final int size;
  _StagedFile.picked(this.picked)
      : voicePath = null,
        durationMs = null,
        name = picked!.name,
        mime = picked.mime,
        size = picked.size;
  _StagedFile.voice(this.voicePath, this.durationMs)
      : picked = null,
        name = 'voice-${DateTime.now().millisecondsSinceEpoch}.m4a',
        mime = 'audio/m4a',
        size = 0;
}

class _QuickCaptureSheetState extends ConsumerState<_QuickCaptureSheet> {
  final _titleCtrl = TextEditingController();
  int? _clusterId;
  final List<_StagedFile> _staged = [];
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _clusterId = widget.defaultClusterId;
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    super.dispose();
  }

  Future<void> _stage(Future<PickedFile?> Function() pick) async {
    setState(() => _error = null);
    try {
      final file = await pick();
      if (file != null) setState(() => _staged.add(_StagedFile.picked(file)));
    } catch (e) {
      setState(() => _error = "Couldn't open the picker.");
    }
  }

  void _stageVoice(String path, int durationMs) {
    setState(() => _staged.add(_StagedFile.voice(path, durationMs)));
  }

  Future<void> _save() async {
    final board = ref.read(boardProvider.notifier);
    final text = _titleCtrl.text.trim();
    if (text.isEmpty && _staged.isEmpty) return;

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final task = await board.addTask(text.isNotEmpty ? text : 'Attached files', _clusterId);
      if (task == null) throw Exception("Couldn't create that task.");

      for (var i = 0; i < _staged.length; i++) {
        final f = _staged[i];
        String path;
        int size;
        if (f.picked != null) {
          final result = await uploadPicked(f.picked!);
          path = result.path;
          size = result.size;
        } else {
          final bytes = await File(f.voicePath!).readAsBytes();
          path = await ApiClient.instance.uploadMedia(bytes, f.name, f.mime, bytes.length);
          size = bytes.length;
        }
        await board.addNote({
          'task_id': task.id,
          'cluster_id': null,
          'kind': noteKindToString(kindForMime(f.mime)),
          'visibility': 'workspace',
          'body': f.name,
          'url': path,
          'mime': f.mime,
          'size_bytes': size,
          'duration_ms': f.durationMs,
          'pos': i.toDouble(),
        });
      }
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = "Couldn't save that.");
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final board = ref.watch(boardProvider);
    final clusters = (board.data?.clusters ?? []).where((c) => c.status == ClusterStatus.active).toList();
    final canSave = (_titleCtrl.text.trim().isNotEmpty || _staged.isNotEmpty) && !_busy;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppColors.lineStrong, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('New task', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: AppColors.ink)),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20, color: AppColors.ink3),
                  onPressed: () => Navigator.of(context).pop(),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _titleCtrl,
              autofocus: true,
              maxLines: 3,
              minLines: 1,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'What needs doing?',
                hintText: 'Enter task title...',
              ),
            ),
            if (_staged.isNotEmpty) ...[
              const SizedBox(height: 10),
              ..._staged.asMap().entries.map((e) => Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: AppColors.panel2, borderRadius: BorderRadius.circular(10)),
                    child: Row(children: [
                      Icon(kindForMime(e.value.mime) == NoteKind.voice ? Icons.mic : (kindForMime(e.value.mime) == NoteKind.image ? Icons.image : Icons.insert_drive_file), size: 15, color: AppColors.ink3),
                      const SizedBox(width: 8),
                      Expanded(child: Text(e.value.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.ink))),
                      IconButton(icon: const Icon(Icons.close, size: 16), onPressed: () => setState(() => _staged.removeAt(e.key))),
                    ]),
                  )),
            ],
            const SizedBox(height: 10),
            Row(children: [
              VoiceRecorder(onRecorded: _stageVoice, disabled: _busy, compact: true),
              const SizedBox(width: 6),
              IconButton(icon: const Icon(Icons.image_outlined, color: AppColors.muted), onPressed: _busy ? null : () => _stage(pickMedia)),
              IconButton(icon: const Icon(Icons.attach_file, color: AppColors.muted), onPressed: _busy ? null : () => _stage(pickDocument)),
            ]),
            const SizedBox(height: 12),
            const Text('GOES TO', style: TextStyle(color: AppColors.ink3, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _pill(
                  label: 'Floating',
                  selected: _clusterId == null,
                  onTap: () => setState(() => _clusterId = null),
                ),
                ...clusters.map((c) => _pill(
                      label: c.name,
                      colorHex: c.color,
                      selected: _clusterId == c.id,
                      onTap: () => setState(() => _clusterId = c.id),
                    )),
              ],
            ),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: AppColors.danger))),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: _busy ? null : () => Navigator.of(context).pop(), child: const Text('Cancel')),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: canSave ? _save : null,
                  child: _busy ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accentInk)) : const Text('Add task'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _pill({
    required String label,
    String? colorHex,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF8B5CF6) : const Color(0xFF222430),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? const Color(0xFFA78BFA) : const Color(0xFF333646),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (selected) ...[
              const Icon(Icons.check, size: 12, color: Colors.white),
              const SizedBox(width: 4),
            ] else if (colorHex != null) ...[
              Container(width: 7, height: 7, decoration: BoxDecoration(color: colorFromHex(colorHex), shape: BoxShape.circle)),
              const SizedBox(width: 5),
            ],
            Text(
              label,
              style: TextStyle(
                color: selected ? Colors.white : AppColors.ink,
                fontSize: 12,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
