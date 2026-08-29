import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_theme.dart';

Future<DateTime?> showCustomDatePicker(
  BuildContext context, {
  required DateTime initialDate,
  DateTime? firstDate,
  DateTime? lastDate,
}) {
  return showDialog<DateTime>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.55),
    builder: (ctx) => _CustomDatePickerDialog(
      initialDate: initialDate,
      firstDate: firstDate ?? DateTime(2020),
      lastDate: lastDate ?? DateTime(2035),
    ),
  );
}

class _CustomDatePickerDialog extends StatefulWidget {
  final DateTime initialDate;
  final DateTime firstDate;
  final DateTime lastDate;

  const _CustomDatePickerDialog({
    required this.initialDate,
    required this.firstDate,
    required this.lastDate,
  });

  @override
  State<_CustomDatePickerDialog> createState() => _CustomDatePickerDialogState();
}

class _CustomDatePickerDialogState extends State<_CustomDatePickerDialog> {
  late DateTime _cursor;
  late DateTime _selected;

  static const _weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  static const _months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  @override
  void initState() {
    super.initState();
    _selected = DateTime(widget.initialDate.year, widget.initialDate.month, widget.initialDate.day);
    _cursor = DateTime(_selected.year, _selected.month, 1);
  }

  void _shiftMonth(int delta) {
    setState(() {
      _cursor = DateTime(_cursor.year, _cursor.month + delta, 1);
    });
  }

  List<DateTime> _monthDays(DateTime cursor) {
    final first = DateTime(cursor.year, cursor.month, 1);
    final start = first.subtract(Duration(days: first.weekday % 7)); // Sunday is 0
    return List.generate(42, (i) => start.add(Duration(days: i)));
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  void _selectPreset(int daysFromNow) {
    final target = DateTime.now().add(Duration(days: daysFromNow));
    final normalized = DateTime(target.year, target.month, target.day);
    setState(() {
      _selected = normalized;
      _cursor = DateTime(normalized.year, normalized.month, 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final dialogBg = isDark ? const Color(0xF2161824) : const Color(0xF7FFFFFF);
    final cardBorder = isDark ? const Color(0xFF282B3C) : const Color(0xFFE2E4EA);
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? const Color(0xFF949BAE) : const Color(0xFF6B7280);
    final chipBg = isDark ? const Color(0xFF1F2232) : const Color(0xFFF3F4F6);

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final days = _monthDays(_cursor);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: dialogBg,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.08),
                    blurRadius: 28,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Header with Selected Date Display
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'SELECT DEADLINE',
                            style: GoogleFonts.inter(
                              color: AppColors.accent,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${_months[_selected.month - 1].substring(0, 3)} ${_selected.day}, ${_selected.year}',
                            style: GoogleFonts.inter(
                              color: textColor,
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: Icon(Icons.close_rounded, color: mutedColor, size: 20),
                        onPressed: () => Navigator.pop(context),
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(4),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // 2. Quick Preset Chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildPresetChip('Today', () => _selectPreset(0), chipBg, textColor, cardBorder),
                        const SizedBox(width: 6),
                        _buildPresetChip('Tomorrow', () => _selectPreset(1), chipBg, textColor, cardBorder),
                        const SizedBox(width: 6),
                        _buildPresetChip('Next Week', () => _selectPreset(7), chipBg, textColor, cardBorder),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 3. Month / Year Navigator
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: Icon(Icons.chevron_left_rounded, color: textColor, size: 22),
                        onPressed: () => _shiftMonth(-1),
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(4),
                      ),
                      Text(
                        '${_months[_cursor.month - 1]} ${_cursor.year}',
                        style: GoogleFonts.inter(
                          color: textColor,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.chevron_right_rounded, color: textColor, size: 22),
                        onPressed: () => _shiftMonth(1),
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(4),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // 4. Weekday Headers
                  Row(
                    children: _weekdays
                        .map((d) => Expanded(
                              child: Center(
                                child: Text(
                                  d,
                                  style: GoogleFonts.inter(
                                    color: mutedColor,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 6),

                  // 5. Modern 7x6 Calendar Grid
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 7,
                      mainAxisSpacing: 3,
                      crossAxisSpacing: 3,
                      childAspectRatio: 1.05,
                    ),
                    itemCount: 42,
                    itemBuilder: (ctx, i) {
                      final day = days[i];
                      final isCurrentMonth = day.month == _cursor.month;
                      final isSel = _isSameDay(day, _selected);
                      final isToday = _isSameDay(day, today);

                      final Color dayTextColor;
                      if (isSel) {
                        dayTextColor = Colors.white;
                      } else if (!isCurrentMonth) {
                        dayTextColor = mutedColor.withValues(alpha: 0.35);
                      } else if (isToday) {
                        dayTextColor = AppColors.accent;
                      } else {
                        dayTextColor = textColor;
                      }

                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            _selected = day;
                            if (day.month != _cursor.month) {
                              _cursor = DateTime(day.year, day.month, 1);
                            }
                          });
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 130),
                          decoration: BoxDecoration(
                            gradient: isSel
                                ? const LinearGradient(
                                    colors: [Color(0xFF8B5CF6), Color(0xFF7C3AED)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  )
                                : null,
                            borderRadius: BorderRadius.circular(10),
                            border: isToday && !isSel
                                ? Border.all(color: AppColors.accent.withValues(alpha: 0.6), width: 1.2)
                                : null,
                            boxShadow: isSel
                                ? [
                                    BoxShadow(
                                      color: const Color(0xFF8B5CF6).withValues(alpha: 0.4),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '${day.day}',
                            style: GoogleFonts.inter(
                              color: dayTextColor,
                              fontSize: 13,
                              fontWeight: isSel || isToday ? FontWeight.w700 : FontWeight.w500,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),

                  // 6. Action Footer
                  Row(
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          foregroundColor: mutedColor,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        ),
                        child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                      const Spacer(),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accent,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => Navigator.pop(context, _selected),
                        child: Text(
                          'Set Date',
                          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPresetChip(String label, VoidCallback onTap, Color bg, Color textColor, Color border) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: border),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(color: textColor, fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
