import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_theme.dart';
import '../models/models.dart';
import 'note_media.dart';
import 'rendered_math_text.dart';

/// Mirrors apps/mobile/src/components/NoteRow.tsx — one authored note (text/rich/code/
/// link/table) or, via NoteMedia, one attachment.
class NoteRow extends StatelessWidget {
  final Note note;
  final bool mine;
  final VoidCallback onDelete;

  const NoteRow({super.key, required this.note, required this.mine, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final isPrivate = note.visibility == NoteVisibility.private_;
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(color: AppColors.panel2, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(note.kind.name.toUpperCase(), style: const TextStyle(color: AppColors.ink3, fontSize: 10, letterSpacing: 0.6)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: (isPrivate ? AppColors.star : AppColors.low).withValues(alpha: 0.13),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(isPrivate ? Icons.visibility_off : Icons.visibility, size: 9, color: isPrivate ? AppColors.star : AppColors.low),
                  const SizedBox(width: 3),
                  Text(isPrivate ? 'Private' : 'Shared',
                      style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: isPrivate ? AppColors.star : AppColors.low)),
                ]),
              ),
              const Spacer(),
              Text(_fmtDate(note.createdAt), style: const TextStyle(color: AppColors.ink3, fontSize: 10.5)),
              if (mine) ...[
                const SizedBox(width: 8),
                InkWell(onTap: onDelete, child: const Icon(Icons.delete_outline, size: 14, color: AppColors.danger)),
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
      return InkWell(
        onTap: () {
          if (note.url != null) launchUrl(Uri.parse(note.url!), mode: LaunchMode.externalApplication);
        },
        child: Text(note.body.isNotEmpty ? note.body : (note.url ?? ''), style: const TextStyle(color: AppColors.low, fontSize: 14)),
      );
    }

    if (note.kind == NoteKind.code) {
      return Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(color: AppColors.bg, borderRadius: BorderRadius.circular(8)),
        width: double.infinity,
        child: Text(note.body, style: const TextStyle(color: AppColors.ink, fontSize: 12, fontFamily: 'monospace')),
      );
    }

    if (note.kind == NoteKind.table) {
      final rows = note.body.split('\n').where((r) => r.trim().isNotEmpty).map((r) => r.split('|').map((c) => c.trim()).toList()).toList();
      if (rows.isEmpty) return const SizedBox.shrink();
      return Table(
        border: TableBorder.all(color: AppColors.lineStrong, width: 0.5),
        children: [
          for (var ri = 0; ri < rows.length; ri++)
            TableRow(
              decoration: BoxDecoration(color: ri == 0 ? AppColors.bg : null),
              children: [
                for (final cell in rows[ri])
                  Padding(
                    padding: const EdgeInsets.all(6),
                    child: Text(cell, style: TextStyle(color: AppColors.ink, fontSize: 12, fontWeight: ri == 0 ? FontWeight.bold : FontWeight.normal)),
                  ),
              ],
            ),
        ],
      );
    }

    if (note.kind == NoteKind.rich) {
      final plain = note.body.replaceAll(RegExp(r'<[^>]+>'), ' ').replaceAll(RegExp(r'\s+'), ' ').trim();
      return RenderedMathText(text: plain);
    }

    return RenderedMathText(text: note.body);
  }
}
