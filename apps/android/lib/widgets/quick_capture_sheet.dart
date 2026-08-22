import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/app_theme.dart';
import '../core/upload_helper.dart';
import '../models/models.dart';
import '../state/board_provider.dart';
import 'voice_recorder.dart';
import 'dart:io';

/// Capture-first entry point behind the FAB: a title, an optional destination cluster, and
/// any number of staged attachments. Nothing uploads until Save. Mirrors
/// apps/mobile/src/components/QuickCaptureSheet.tsx.
Future<void> showQuickCaptureSheet(BuildContext context, {int? defaultClusterId}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.panel,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
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
          'pos': i,
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
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.lineStrong, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 14),
            const Text('New task', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.ink)),
            const SizedBox(height: 12),
            TextField(
              controller: _titleCtrl,
              autofocus: true,
              maxLines: 3,
              minLines: 1,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'What needs doing?'),
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
            const SizedBox(height: 8),
            Row(children: [
              VoiceRecorder(onRecorded: _stageVoice, disabled: _busy, compact: true),
              IconButton(icon: const Icon(Icons.image_outlined), onPressed: _busy ? null : () => _stage(pickMedia)),
              IconButton(icon: const Icon(Icons.attach_file), onPressed: _busy ? null : () => _stage(pickDocument)),
            ]),
            const SizedBox(height: 8),
            const Text('GOES TO', style: TextStyle(color: AppColors.muted, fontSize: 11, letterSpacing: 0.6)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ChoiceChip(label: const Text('Floating'), selected: _clusterId == null, onSelected: (_) => setState(() => _clusterId = null)),
                ...clusters.map((c) => ChoiceChip(
                      label: Text(c.name),
                      selected: _clusterId == c.id,
                      avatar: CircleAvatar(backgroundColor: colorFromHex(c.color), radius: 6),
                      onSelected: (_) => setState(() => _clusterId = c.id),
                    )),
              ],
            ),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: AppColors.danger))),
            const SizedBox(height: 16),
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
}
