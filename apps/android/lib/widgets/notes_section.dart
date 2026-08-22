import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../models/models.dart';
import 'note_row.dart';

class NoteParent {
  final int? taskId;
  final int? clusterId;
  const NoteParent({this.taskId, this.clusterId});
}

/// Authored notes only — text/code/link/table. Raw files live in AttachmentsSection, the
/// same split the web app uses. Mirrors apps/mobile/src/components/NotesSection.tsx.
class NotesSection extends StatefulWidget {
  final NoteParent parent;
  final List<Note> notes;
  final String userId;
  final Object resetKey;
  final Future<Note> Function(Map<String, dynamic>) onAdd;
  final void Function(int) onDelete;

  const NotesSection({
    super.key,
    required this.parent,
    required this.notes,
    required this.userId,
    required this.resetKey,
    required this.onAdd,
    required this.onDelete,
  });

  @override
  State<NotesSection> createState() => _NotesSectionState();
}

const _composers = [
  (kind: NoteKind.text, label: 'Text', icon: Icons.description_outlined),
  (kind: NoteKind.code, label: 'Code', icon: Icons.code),
  (kind: NoteKind.link, label: 'Link', icon: Icons.link),
  (kind: NoteKind.table, label: 'Table', icon: Icons.grid_on_outlined),
];

class _NotesSectionState extends State<NotesSection> {
  NoteKind _kind = NoteKind.text;
  final _bodyCtrl = TextEditingController();
  final _linkCtrl = TextEditingController();
  bool _private = false;
  bool _busy = false;
  String? _error;

  @override
  void didUpdateWidget(covariant NotesSection old) {
    super.didUpdateWidget(old);
    if (old.resetKey != widget.resetKey) {
      _bodyCtrl.clear();
      _linkCtrl.clear();
      setState(() {
        _kind = NoteKind.text;
        _error = null;
      });
    }
  }

  @override
  void dispose() {
    _bodyCtrl.dispose();
    _linkCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final isLink = _kind == NoteKind.link;
    final url = _linkCtrl.text.trim();
    final text = _bodyCtrl.text.trim();
    if (isLink ? url.isEmpty : text.isEmpty) return;

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final textNotes = widget.notes.where((n) => isTextNoteKind(n.kind)).toList();
      await widget.onAdd({
        'task_id': widget.parent.taskId,
        'cluster_id': widget.parent.clusterId,
        'kind': noteKindToString(_kind),
        'visibility': _private ? 'private' : 'workspace',
        'body': text,
        'url': isLink ? url : null,
        'mime': null,
        'size_bytes': 0,
        'duration_ms': null,
        'pos': textNotes.length,
      });
      _bodyCtrl.clear();
      _linkCtrl.clear();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textNotes = widget.notes.where((n) => isTextNoteKind(n.kind)).toList()..sort((a, b) => a.createdAt.compareTo(b.createdAt));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(color: AppColors.panel2, borderRadius: BorderRadius.circular(10)),
              child: Row(
                children: _composers.map((c) {
                  final on = _kind == c.kind;
                  return InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () => setState(() => _kind = c.kind),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                      decoration: BoxDecoration(color: on ? AppColors.accent : null, borderRadius: BorderRadius.circular(8)),
                      child: Icon(c.icon, size: 15, color: on ? AppColors.accentInk : AppColors.muted),
                    ),
                  );
                }).toList(),
              ),
            ),
            const Spacer(),
            InkWell(
              onTap: () => setState(() => _private = !_private),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  border: Border.all(color: _private ? AppColors.star : AppColors.lineStrong),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(_private ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 13, color: _private ? AppColors.star : AppColors.muted),
                  const SizedBox(width: 5),
                  Text(_private ? 'Private' : 'Shared', style: TextStyle(color: _private ? AppColors.star : AppColors.muted, fontSize: 12)),
                ]),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_kind == NoteKind.link) ...[
          TextField(
            controller: _linkCtrl,
            decoration: const InputDecoration(hintText: 'https://…'),
            keyboardType: TextInputType.url,
          ),
          const SizedBox(height: 8),
          TextField(controller: _bodyCtrl, decoration: const InputDecoration(hintText: 'What is it? (optional)')),
        ] else
          TextField(
            controller: _bodyCtrl,
            maxLines: 4,
            style: _kind == NoteKind.text ? null : const TextStyle(fontFamily: 'monospace', fontSize: 13),
            decoration: InputDecoration(
              hintText: _kind == NoteKind.code
                  ? 'Paste code — kept as-is'
                  : _kind == NoteKind.table
                      ? 'One row per line, cells split by |'
                      : 'Write a note…',
            ),
          ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accentInk))
                : const Text('Add note'),
          ),
        ),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12.5))),
        const SizedBox(height: 10),
        if (textNotes.isEmpty)
          const Text('No notes yet.', style: TextStyle(color: AppColors.ink3, fontSize: 12, fontStyle: FontStyle.italic))
        else
          Column(
            children: textNotes
                .map((n) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: NoteRow(note: n, mine: n.createdBy == widget.userId, onDelete: () => widget.onDelete(n.id)),
                    ))
                .toList(),
          ),
      ],
    );
  }
}
