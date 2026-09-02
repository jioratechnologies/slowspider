import 'package:flutter/material.dart';

import '../design/typography.dart';

import '../core/app_theme.dart';
import '../design/tokens.dart';
import '../models/models.dart';
import 'note_row.dart';
import 'rendered_math_text.dart';
import '../design/icons.dart';

class NoteParent {
  final int? taskId;
  final int? clusterId;
  const NoteParent({this.taskId, this.clusterId});
}

const _quickMathTokens = [
  (label: 'ħ', insert: r'$\hbar$'),
  (label: '∇', insert: r'$\nabla$'),
  (label: '∂', insert: r'$\partial$'),
  (label: '∫', insert: r'$\int$'),
  (label: '∑', insert: r'$\sum$'),
  (label: '√', insert: r'$\sqrt{x}$'),
  (label: 'a/b', insert: r'$\frac{a}{b}$'),
  (label: 'x²', insert: r'$x^2$'),
  (label: 'Ĥ', insert: r'$\hat{H}$'),
  (label: '|ψ⟩', insert: r'$|\psi\rangle$'),
  (label: '⟨ψ|', insert: r'$\langle\psi|$'),
  (label: '⟨ψ|Ĥ|ψ⟩', insert: r'$\langle\psi|\hat{H}|\psi\rangle$'),
  (label: 'α', insert: r'$\alpha$'),
  (label: 'β', insert: r'$\beta$'),
  (label: 'π', insert: r'$\pi$'),
  (label: 'Δ', insert: r'$\Delta$'),
  (label: 'λ', insert: r'$\lambda$'),
];

/// Authored notes only — text/rich/code/link/table. Raw files live in AttachmentsSection.
class NotesSection extends StatefulWidget {
  final NoteParent parent;
  final List<Note> notes;
  final String userId;
  final Object resetKey;
  final int storageUsed;
  final Future<Note> Function(Map<String, dynamic>) onAdd;
  final void Function(int) onDelete;

  const NotesSection({
    super.key,
    required this.parent,
    required this.notes,
    required this.userId,
    required this.resetKey,
    this.storageUsed = 0,
    required this.onAdd,
    required this.onDelete,
  });

  @override
  State<NotesSection> createState() => _NotesSectionState();
}

const _composers = [
  (kind: NoteKind.text, label: 'Text', icon: SpiderIcons.description),
  (kind: NoteKind.rich, label: 'Rich', icon: SpiderIcons.paint),
  (kind: NoteKind.code, label: 'Code', icon: SpiderIcons.code),
  (kind: NoteKind.link, label: 'Link', icon: SpiderIcons.link),
  (kind: NoteKind.table, label: 'Table', icon: SpiderIcons.grid),
];

class _NotesSectionState extends State<NotesSection> {
  NoteKind _kind = NoteKind.text;
  final _bodyCtrl = TextEditingController();
  final _linkCtrl = TextEditingController();
  final _bodyFocusNode = FocusNode();
  bool _private = false;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _bodyCtrl.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    setState(() {});
  }

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
    _bodyCtrl.removeListener(_onTextChanged);
    _bodyCtrl.dispose();
    _linkCtrl.dispose();
    _bodyFocusNode.dispose();
    super.dispose();
  }

  void _insertMathToken(String token) {
    final text = _bodyCtrl.text;
    final selection = _bodyCtrl.selection;
    int targetCursor;

    if (selection.isValid && selection.start >= 0 && selection.end >= 0) {
      final newText = text.replaceRange(selection.start, selection.end, token);
      targetCursor = selection.start + token.length;
      _bodyCtrl.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: targetCursor),
      );
    } else {
      final newText = text.isEmpty ? token : '$text $token';
      targetCursor = newText.length;
      _bodyCtrl.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: targetCursor),
      );
    }

    _bodyFocusNode.requestFocus();
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
      final textNotes = widget.notes
          .where((n) => isTextNoteKind(n.kind))
          .toList();
      await widget.onAdd({
        'task_id': widget.parent.taskId,
        'cluster_id': widget.parent.clusterId,
        'kind': noteKindToString(_kind),
        'visibility': _private ? 'private' : 'workspace',
        'body': text,
        'url': isLink ? url : null,
        'mime': null,
        'size_bytes': text.length,
        'duration_ms': null,
        'pos': textNotes.length.toDouble(),
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final p = context.ink;

    final cardBg = isDark ? AppColors.panel2 : Colors.white;
    final cardBorder = isDark ? AppColors.panel3 : AppColors.lightLine;
    final inputBg = isDark ? AppColors.panel2 : AppColors.lightPanel2;
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? AppColors.muted : AppColors.lightMuted;
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;

    final textNotes = widget.notes.where((n) => isTextNoteKind(n.kind)).toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    const totalStorage = 10 * 1024 * 1024 * 1024; // 10 GB
    final usedMb = (widget.storageUsed / (1024 * 1024)).toStringAsFixed(1);
    final quotaPct = (widget.storageUsed / totalStorage).clamp(0.0, 1.0);

    final hasContent = _bodyCtrl.text.trim().isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Notice Text
        Text(
          'Private notes stay visible only to you, even when this workspace is shared.',
          style: AppType.sans(color: mutedColor, fontSize: 12.5),
        ),
        const SizedBox(height: 14),

        // 2. Composer Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: cardBorder),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? Colors.black.withValues(alpha: 0.2)
                    : Colors.black.withValues(alpha: 0.02),
                blurRadius: 6,
                offset: const Offset(0, 1.5),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Composer Kind & Visibility Row
              Row(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: inputBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: _composers.map((c) {
                            final on = _kind == c.kind;
                            return GestureDetector(
                              onTap: () => setState(() => _kind = c.kind),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 140),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: on ? p.ink : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    AppIcon(
                                      c.icon,
                                      size: 13,
                                      color: on ? p.onInk : mutedColor,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      c.label,
                                      style: AppType.sans(
                                        color: on ? p.onInk : mutedColor,
                                        fontSize: 11.5,
                                        fontWeight: on
                                            ? FontWeight.w700
                                            : FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Private / Shared Toggle Pill
                  GestureDetector(
                    onTap: () => setState(() => _private = !_private),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: _private
                            ? AppColors.gold.withValues(alpha: 0.15)
                            : inputBg,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: _private ? AppColors.gold : cardBorder,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppIcon(
                            _private ? SpiderIcons.lock : SpiderIcons.globe,
                            size: 13,
                            color: _private ? AppColors.gold : mutedColor,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _private ? 'Private' : 'Shared',
                            style: AppType.sans(
                              color: _private ? AppColors.gold : mutedColor,
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
              const SizedBox(height: 12),

              // Quick Math / LaTeX Toolbar
              if (_kind == NoteKind.text || _kind == NoteKind.rich) ...[
                SizedBox(
                  height: 28,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      Center(
                        child: Text(
                          'MATH:',
                          style: AppType.sans(
                            color: ink3Color,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      for (final item in _quickMathTokens)
                        Padding(
                          padding: const EdgeInsets.only(right: 5),
                          child: GestureDetector(
                            onTap: () => _insertMathToken(item.insert),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: inputBg,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: cardBorder),
                              ),
                              child: Text(
                                item.label,
                                style: AppType.sans(
                                  color: textColor,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],

              // Note Content Input
              if (_kind == NoteKind.link) ...[
                TextField(
                  controller: _linkCtrl,
                  keyboardType: TextInputType.url,
                  style: AppType.sans(color: textColor, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'https://example.com...',
                    hintStyle: AppType.sans(color: ink3Color, fontSize: 13),
                    filled: true,
                    fillColor: inputBg,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: cardBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: cardBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(
                        color: AppColors.accent,
                        width: 1.4,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _bodyCtrl,
                  focusNode: _bodyFocusNode,
                  style: AppType.sans(color: textColor, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Description (optional)',
                    hintStyle: AppType.sans(color: ink3Color, fontSize: 13),
                    filled: true,
                    fillColor: inputBg,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: cardBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: cardBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(
                        color: AppColors.accent,
                        width: 1.4,
                      ),
                    ),
                  ),
                ),
              ] else ...[
                TextField(
                  controller: _bodyCtrl,
                  focusNode: _bodyFocusNode,
                  maxLines: 4,
                  style: _kind == NoteKind.code
                      ? AppType.mono(color: textColor, fontSize: 12.5)
                      : AppType.sans(
                          color: textColor,
                          fontSize: 13,
                          height: 1.4,
                        ),
                  decoration: InputDecoration(
                    hintText: _kind == NoteKind.code
                        ? 'Paste code snippet here...'
                        : _kind == NoteKind.table
                        ? 'One row per line, cells split by |'
                        : r'A note on this task... (LaTeX math supported: $E=mc^2$)',
                    hintStyle: AppType.sans(color: ink3Color, fontSize: 12.5),
                    filled: true,
                    fillColor: inputBg,
                    contentPadding: const EdgeInsets.all(12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: cardBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: cardBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(
                        color: AppColors.accent,
                        width: 1.4,
                      ),
                    ),
                  ),
                ),
              ],

              // Live Rendered Math / Rich Preview Card
              if (hasContent &&
                  (_kind == NoteKind.text || _kind == NoteKind.rich)) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.panel : AppColors.lightBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          AppIcon(
                            SpiderIcons.eye,
                            size: 12,
                            color: AppColors.accent,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'LIVE PREVIEW',
                            style: AppType.sans(
                              color: AppColors.accent,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      RenderedMathText(
                        text: _bodyCtrl.text,
                        style: AppType.sans(
                          color: textColor,
                          fontSize: 13,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 12),

              // Add Note Button
              SizedBox(
                height: 42,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: p.ink,
                    foregroundColor: p.onInk,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: p.onInk,
                          ),
                        )
                      : Text(
                          'Add note',
                          style: AppType.sans(
                            color: p.onInk,
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),

              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    _error!,
                    style: AppType.sans(color: AppColors.danger, fontSize: 12),
                  ),
                ),
            ],
          ),
        ),

        const SizedBox(height: 18),

        // 3. Notes List
        if (textNotes.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Text(
                'No notes on this task yet.',
                style: AppType.sans(color: mutedColor, fontSize: 13),
              ),
            ),
          )
        else
          for (final n in textNotes) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: NoteRow(
                note: n,
                mine: n.createdBy == widget.userId,
                onDelete: () => widget.onDelete(n.id),
              ),
            ),
          ],

        const SizedBox(height: 16),

        // 4. Storage Quota Indicator Card
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
                  Text(
                    'Cloud Storage',
                    style: AppType.sans(
                      color: mutedColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '$usedMb MB of 10 GB',
                    style: AppType.sans(
                      color: textColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: quotaPct,
                  minHeight: 5,
                  backgroundColor: inputBg,
                  color: AppColors.accent,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
