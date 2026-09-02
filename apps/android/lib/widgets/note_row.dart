import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_theme.dart';
import '../design/tokens.dart';
import '../models/models.dart';
import 'note_media.dart';
import 'rendered_math_text.dart';
import '../design/icons.dart';

/// Mirrors apps/mobile/src/components/NoteRow.tsx — one authored note (text/rich/code/
/// link/table) or, via NoteMedia, one attachment.
class NoteRow extends StatelessWidget {
  final Note note;
  final bool mine;
  final VoidCallback onDelete;

  const NoteRow({
    super.key,
    required this.note,
    required this.mine,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isPrivate = note.visibility == NoteVisibility.private_;
    final p = context.ink;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E1E24) : p.surfaceAlt;
    final inkFaint = p.inkFaint;
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: p.line, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                note.kind.name.toUpperCase(),
                style: TextStyle(
                  color: inkFaint,
                  fontSize: 10,
                  letterSpacing: 0.6,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: (isPrivate ? p.gold : p.inkMuted)
                      .withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: (isPrivate ? p.gold : p.inkMuted)
                        .withValues(alpha: 0.22),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AppIcon(
                      isPrivate ? SpiderIcons.eyeOff : SpiderIcons.eye,
                      size: 9,
                      color: isPrivate ? p.gold : p.inkMuted,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      isPrivate ? 'Private' : 'Shared',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                        color: isPrivate ? p.gold : p.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                _fmtDate(note.createdAt),
                style: TextStyle(color: inkFaint, fontSize: 10.5),
              ),
              if (mine) ...[
                const SizedBox(width: 8),
                InkWell(
                  onTap: onDelete,
                  child: AppIcon(
                    SpiderIcons.trash,
                    size: 14,
                    color: p.danger,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 7),
          _body(context),
        ],
      ),
    );
  }

  String _fmtDate(String iso) {
    try {
      return DateFormat.MMMd().format(DateTime.parse(iso));
    } catch (_) {
      return '';
    }
  }

  Widget _body(BuildContext context) {
    if (isAttachmentKind(note.kind)) return NoteMedia(note: note);

    if (note.kind == NoteKind.link) {
      final p = context.ink;
      return InkWell(
        onTap: () {
          if (note.url != null) {
            launchUrl(
              Uri.parse(note.url!),
              mode: LaunchMode.externalApplication,
            );
          }
        },
        child: Text(
          note.body.isNotEmpty ? note.body : (note.url ?? ''),
          style: TextStyle(color: p.ink, fontSize: 14, decoration: TextDecoration.underline, decorationColor: p.gold),
        ),
      );
    }

    if (note.kind == NoteKind.code) {
      final p = context.ink;
      return Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: p.bg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: p.lineStrong),
        ),
        width: double.infinity,
        child: Text(
          note.body,
          style: TextStyle(
            color: p.ink,
            fontSize: 12,
            fontFamily: 'monospace',
          ),
        ),
      );
    }

    if (note.kind == NoteKind.table) {
      final p = context.ink;
      final rows = note.body
          .split('\n')
          .where((r) => r.trim().isNotEmpty)
          .map((r) => r.split('|').map((c) => c.trim()).toList())
          .toList();
      if (rows.isEmpty) return const SizedBox.shrink();
      return Table(
        border: TableBorder.all(color: p.lineStrong, width: 0.5),
        children: [
          for (var ri = 0; ri < rows.length; ri++)
            TableRow(
              decoration: BoxDecoration(color: ri == 0 ? p.bg : p.surface),
              children: [
                for (final cell in rows[ri])
                  Padding(
                    padding: const EdgeInsets.all(6),
                    child: Text(
                      cell,
                      style: TextStyle(
                        color: p.ink,
                        fontSize: 12,
                        fontWeight: ri == 0
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                  ),
              ],
            ),
        ],
      );
    }

    if (note.kind == NoteKind.rich) {
      final plain = note.body
          .replaceAll(RegExp(r'<[^>]+>'), ' ')
          .replaceAll(RegExp(r'\s+'), ' ')
          .trim();
      return RenderedMathText(text: plain);
    }

    return RenderedMathText(text: note.body);
  }
}
