import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/api_client.dart';
import '../core/app_icons.dart';
import '../core/app_theme.dart';
import '../core/upload_helper.dart';
import '../models/models.dart';
import 'note_media.dart';
import 'voice_recorder.dart';

const int _quotaBytes = 10 * 1024 * 1024 * 1024;

IconData _iconFor(NoteKind kind) {
  switch (kind) {
    case NoteKind.voice:
      return Icons.mic_rounded;
    case NoteKind.image:
      return Icons.image_rounded;
    case NoteKind.video:
      return Icons.videocam_rounded;
    default:
      return Icons.insert_drive_file_rounded;
  }
}

String _displayName(Note note) {
  if (note.kind == NoteKind.voice && (note.body.startsWith('voice-') || note.body.startsWith('Audio_Record_'))) {
    return 'Voice Recording';
  }
  return note.body.isNotEmpty ? note.body : 'Untitled File';
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final cardBg = isDark ? const Color(0xFF191B26) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF282B3C) : const Color(0xFFE2E4EA);
    final inputBg = isDark ? const Color(0xFF1F2230) : const Color(0xFFF3F4F6);
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? const Color(0xFF949BAE) : const Color(0xFF6B7280);
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;

    final quotaPct = ((widget.storageUsed / _quotaBytes) * 100).clamp(0, 100).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Upload Actions Row
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            VoiceRecorder(onRecorded: _addVoice, disabled: _busy),
            _toolBtn(Icons.image_outlined, 'Photo / video', const Color(0xFF0EA5E9), () => _attach(pickMedia), isDark, inputBg, cardBorder, textColor),
            _toolBtn(Icons.attach_file_rounded, 'Attach file', const Color(0xFFA855F7), () => _attach(pickDocument), isDark, inputBg, cardBorder, textColor),
          ],
        ),

        if (_error != null) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFEF4444).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
            ),
            child: Text(_error!, style: GoogleFonts.inter(color: const Color(0xFFEF4444), fontSize: 12)),
          ),
        ],

        const SizedBox(height: 16),

        // 2. Attachments List
        if (widget.attachments.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.folder_open_rounded, size: 36, color: ink3Color),
                  const SizedBox(height: 8),
                  Text(
                    'No files attached yet.',
                    style: GoogleFonts.inter(color: mutedColor, fontSize: 13),
                  ),
                ],
              ),
            ),
          )
        else
          Column(
            children: widget.attachments.map((a) {
              final expanded = _expanded == a.id;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: cardBorder),
                  boxShadow: [
                    BoxShadow(
                      color: isDark ? Colors.black.withValues(alpha: 0.15) : Colors.black.withValues(alpha: 0.02),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: const Color(0xFF8B5CF6).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(_iconFor(a.kind), size: 16, color: AppColors.accent),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _expanded = expanded ? null : a.id),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _displayName(a),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(color: textColor, fontSize: 13, fontWeight: FontWeight.w600),
                                  ),
                                  if (a.sizeBytes > 0)
                                    Text(
                                      formatBytes(a.sizeBytes),
                                      style: GoogleFonts.inter(color: mutedColor, fontSize: 11),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          if (a.createdBy == widget.currentUserId) ...[
                            IconButton(
                              icon: const Icon(AppIcons.delete, size: 16, color: AppColors.danger),
                              tooltip: 'Delete file',
                              onPressed: () => widget.onDelete(a.id),
                              constraints: const BoxConstraints(),
                              padding: const EdgeInsets.all(6),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (expanded)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          border: Border(top: BorderSide(color: cardBorder, width: 0.8)),
                        ),
                        width: double.infinity,
                        child: NoteMedia(note: a),
                      ),
                  ],
                ),
              );
            }).toList(),
          ),

        const SizedBox(height: 16),

        // 3. Storage Usage Card
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Storage Usage', style: GoogleFonts.inter(color: mutedColor, fontSize: 11, fontWeight: FontWeight.w600)),
                  Text(
                    '${formatBytes(widget.storageUsed)} of ${formatBytes(_quotaBytes)} ($quotaPct%)',
                    style: GoogleFonts.inter(color: textColor, fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: (quotaPct / 100).clamp(0.0, 1.0),
                  minHeight: 5,
                  backgroundColor: inputBg,
                  color: quotaPct > 90 ? const Color(0xFFEF4444) : AppColors.accent,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _toolBtn(
    IconData icon,
    String label,
    Color iconColor,
    VoidCallback onTap,
    bool isDark,
    Color inputBg,
    Color cardBorder,
    Color textColor,
  ) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _busy ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E212E) : const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: cardBorder),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: iconColor),
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.inter(color: textColor, fontSize: 12.5, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
