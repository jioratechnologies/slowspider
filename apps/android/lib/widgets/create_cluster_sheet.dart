import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../design/icons.dart';
import '../design/tokens.dart';
import '../design/typography.dart';

Future<void> showCreateClusterSheet(
  BuildContext context, {
  required void Function(String name, String color) onCreate,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: isDark ? AppColors.panel : Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final p = context.ink;

    final textColor = p.ink;
    final mutedColor = p.inkMuted;
    final faintColor = p.inkFaint;
    final line = p.line;
    final lineStrong = p.lineStrong;
    final surfaceAlt = p.surfaceAlt;

    final canCreate = _nameCtrl.text.trim().isNotEmpty;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: lineStrong,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'New cluster',
                  style: AppType.heading(textColor).copyWith(
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Material(
                  color: Colors.transparent,
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    customBorder: const CircleBorder(),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: surfaceAlt,
                        shape: BoxShape.circle,
                        border: Border.all(color: line),
                      ),
                      child: AppIcon(
                        SpiderIcons.close,
                        size: 16,
                        color: mutedColor,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Name field
            TextField(
              controller: _nameCtrl,
              autofocus: true,
              style: AppType.sans(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
              decoration: InputDecoration(
                labelText: 'Cluster name',
                hintText: 'e.g. Quantum Optics, General Rel...',
                labelStyle: AppType.label(mutedColor),
                hintStyle: AppType.sans(color: faintColor, fontSize: 13),
                filled: true,
                fillColor: surfaceAlt,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: line),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: line),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: p.ink, width: 1.4),
                ),
              ),
              onSubmitted: (_) => _submit(),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
            Text(
              'COLOUR',
              style: AppType.sans(
                color: faintColor,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: clusterColors
                    .map(
                      (c) => Padding(
                        padding: const EdgeInsets.only(right: 12),
                        child: GestureDetector(
                          onTap: () => setState(() => _color = c),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 140),
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: colorFromHex(c),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: c == _color
                                    ? (isDark ? Colors.white : p.ink)
                                    : Colors.transparent,
                                width: 2.5,
                              ),
                              boxShadow: c == _color
                                  ? [
                                      BoxShadow(
                                        color: colorFromHex(c).withValues(alpha: 0.35),
                                        blurRadius: 8,
                                        spreadRadius: 1,
                                      ),
                                    ]
                                  : null,
                            ),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 22),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: TextButton.styleFrom(
                    foregroundColor: mutedColor,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    'Cancel',
                    style: AppType.sans(
                      color: mutedColor,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 140),
                  child: ElevatedButton(
                    onPressed: canCreate ? _submit : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: p.ink,
                      foregroundColor: p.onInk,
                      disabledBackgroundColor: surfaceAlt,
                      disabledForegroundColor: faintColor,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Create',
                      style: AppType.sans(
                        color: canCreate ? p.onInk : faintColor,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
