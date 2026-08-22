import 'dart:io';

import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/app_theme.dart';
import '../core/upload_helper.dart';
import '../models/models.dart';
import 'note_media.dart';
import 'voice_recorder.dart';

const int _quotaBytes = 10 * 1024 * 1024 * 1024;

IconData _iconFor(NoteKind kind) {
  switch (kind) {
    case NoteKind.voice:
      return Icons.mic;
    case NoteKind.image:
      return Icons.image;
    case NoteKind.video:
      return Icons.videocam;
    default:
      return Icons.insert_drive_file;
  }
}

String _displayName(Note note) {
  if (note.kind == NoteKind.voice && (note.body.startsWith('voice-') || note.body.startsWith('Audio_Record_'))) return 'Voice Recording';
  return note.body.isNotEmpty ? note.body : 'Untitled';
}

/// Raw files hanging off a task — mirrors apps/mobile/src/components/AttachmentsSection.tsx.
class AttachmentsSection extends StatefulWidget {
  final int taskId;
  final List<Note> attachments;
  final int storageUsed;
  final String currentUserId;
  final Future<Note> Function(Map<String, dynamic>) onAdd;
  final void Function(int) onDelete;

  const AttachmentsSection({
    super.key,
    required this.taskId,
    required this.attachments,
    required this.storageUsed,
    required this.currentUserId,
    required this.onAdd,
    required this.onDelete,
  });

  @override
  State<AttachmentsSection> createState() => _AttachmentsSectionState();
}

class _AttachmentsSectionState extends State<AttachmentsSection> {
  bool _busy = false;
  String? _error;
  int? _expanded;

  Future<void> _attach(Future<PickedFile?> Function() pick) async {
    setState(() => _error = null);
    PickedFile? file;
    try {
      file = await pick();
    } catch (e) {
      setState(() => _error = "Couldn't open the picker.");
      return;
    }
    if (file == null) return;

    setState(() => _busy = true);
    try {
      final result = await uploadPicked(file);
      await widget.onAdd({
        'task_id': widget.taskId,
        'cluster_id': null,
        'kind': noteKindToString(kindForMime(file.mime)),
        'visibility': 'workspace',
        'body': file.name,
        'url': result.path,
        'mime': file.mime,
        'size_bytes': result.size,
        'duration_ms': null,
        'pos': widget.attachments.length,
      });
    } catch (e) {
      setState(() => _error = 'Upload failed.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addVoice(String path, int durationMs) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final bytes = await File(path).readAsBytes();
      final name = 'voice-${DateTime.now().millisecondsSinceEpoch}.m4a';
      final uploadedPath = await ApiClient.instance.uploadMedia(bytes, name, 'audio/m4a', bytes.length);
      await widget.onAdd({
        'task_id': widget.taskId,
        'cluster_id': null,
        'kind': 'voice',
        'visibility': 'workspace',
        'body': name,
        'url': uploadedPath,
        'mime': 'audio/m4a',
        'size_bytes': bytes.length,
        'duration_ms': durationMs,
        'pos': widget.attachments.length,
      });
    } catch (e) {
      setState(() => _error = 'Upload failed.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final quotaPct = ((widget.storageUsed / _quotaBytes) * 100).clamp(0, 100).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            VoiceRecorder(onRecorded: _addVoice, disabled: _busy),
            _toolBtn(Icons.image_outlined, 'Photo / video', () => _attach(pickMedia)),
            _toolBtn(Icons.attach_file, 'Attach file', () => _attach(pickDocument)),
          ],
        ),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12.5))),
        const SizedBox(height: 10),
        if (widget.attachments.isEmpty)
          const Text('No attachments yet.', style: TextStyle(color: AppColors.ink3, fontSize: 12))
        else
          Column(
            children: widget.attachments.map((a) {
              final expanded = _expanded == a.id;
              return Container(
                margin: const EdgeInsets.only(bottom: 6),
                decoration: BoxDecoration(color: AppColors.panel2, borderRadius: BorderRadius.circular(10)),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                      child: Row(
                        children: [
                          Icon(_iconFor(a.kind), size: 15, color: AppColors.ink3),
                          const SizedBox(width: 8),
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _expanded = expanded ? null : a.id),
                              child: Text(_displayName(a), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.ink, fontSize: 13)),
                            ),
                          ),
                          if (a.sizeBytes > 0) Text(formatBytes(a.sizeBytes), style: const TextStyle(color: AppColors.ink3, fontSize: 11)),
                          if (a.createdBy == widget.currentUserId) ...[
                            const SizedBox(width: 8),
                            InkWell(onTap: () => widget.onDelete(a.id), child: const Icon(Icons.delete_outline, size: 15, color: AppColors.danger)),
                          ],
                        ],
                      ),
                    ),
                    if (expanded)
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.lineStrong, width: 0.5))),
                        width: double.infinity,
                        child: NoteMedia(note: a),
                      ),
                  ],
                ),
              );
            }).toList(),
          ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(2),
                child: LinearProgressIndicator(
                  value: quotaPct / 100,
                  minHeight: 4,
                  backgroundColor: AppColors.panel2,
                  color: quotaPct > 90 ? AppColors.danger : AppColors.accent,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text('${formatBytes(widget.storageUsed)} / ${formatBytes(_quotaBytes)}', style: const TextStyle(color: AppColors.ink3, fontSize: 11)),
          ],
        ),
      ],
    );
  }

  Widget _toolBtn(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: _busy ? null : onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(border: Border.all(color: AppColors.lineStrong), borderRadius: BorderRadius.circular(10)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 15, color: AppColors.ink),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(color: AppColors.ink, fontSize: 13)),
        ]),
      ),
    );
  }
}
