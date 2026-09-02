import 'dart:ui';

import 'package:flutter/material.dart';

import '../design/typography.dart';
import '../design/icons.dart';
import '../core/app_theme.dart';
import '../design/tokens.dart';

Future<TimeOfDay?> showCustomTimePicker(
  BuildContext context, {
  required TimeOfDay initialTime,
}) {
  return showDialog<TimeOfDay>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.55),
    builder: (ctx) => _CustomTimePickerDialog(initialTime: initialTime),
  );
}

class _CustomTimePickerDialog extends StatefulWidget {
  final TimeOfDay initialTime;
  const _CustomTimePickerDialog({required this.initialTime});

  @override
  State<_CustomTimePickerDialog> createState() =>
      _CustomTimePickerDialogState();
}

class _CustomTimePickerDialogState extends State<_CustomTimePickerDialog> {
  late int _hour;
  late int _minute;
  late bool _isPm;

  @override
  void initState() {
    super.initState();
    final h = widget.initialTime.hour;
    _isPm = h >= 12;
    _hour = h == 0 ? 12 : (h > 12 ? h - 12 : h);
    _minute = widget.initialTime.minute;
  }

  void _setPreset(int hour24, int min) {
    setState(() {
      _isPm = hour24 >= 12;
      _hour = hour24 == 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24);
      _minute = min;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final p = context.ink;

    final dialogBg = isDark ? AppColors.bg : AppColors.lightBg;
    final cardBorder = isDark ? AppColors.panel3 : AppColors.lightLine;
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? AppColors.muted : AppColors.lightMuted;
    final chipBg = isDark ? AppColors.panel2 : AppColors.lightPanel2;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 340),
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
                  // 1. Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'SELECT TIME',
                            style: AppType.sans(
                              color: AppColors.muted,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${_hour.toString().padLeft(2, '0')}:${_minute.toString().padLeft(2, '0')} ${_isPm ? 'PM' : 'AM'}',
                            style: AppType.sans(
                              color: textColor,
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: AppIcon(
                          SpiderIcons.close,
                          color: mutedColor,
                          size: 20,
                        ),
                        onPressed: () => Navigator.pop(context),
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(4),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // 2. Preset Quick Times
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildPresetChip(
                          'Morning (9 AM)',
                          () => _setPreset(9, 0),
                          chipBg,
                          textColor,
                          cardBorder,
                        ),
                        const SizedBox(width: 6),
                        _buildPresetChip(
                          'Afternoon (2 PM)',
                          () => _setPreset(14, 0),
                          chipBg,
                          textColor,
                          cardBorder,
                        ),
                        const SizedBox(width: 6),
                        _buildPresetChip(
                          'Evening (6 PM)',
                          () => _setPreset(18, 0),
                          chipBg,
                          textColor,
                          cardBorder,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // 3. Time Spinner / Selector Card
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: chipBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Hours
                        _buildNumberColumn(
                          value: _hour,
                          min: 1,
                          max: 12,
                          onChanged: (v) => setState(() => _hour = v),
                          textColor: textColor,
                          mutedColor: mutedColor,
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: Text(
                            ':',
                            style: AppType.sans(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              color: textColor,
                            ),
                          ),
                        ),
                        // Minutes
                        _buildNumberColumn(
                          value: _minute,
                          min: 0,
                          max: 59,
                          step: 5,
                          onChanged: (v) => setState(() => _minute = v),
                          textColor: textColor,
                          mutedColor: mutedColor,
                        ),
                        const SizedBox(width: 16),
                        // AM / PM Switcher
                        Container(
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.panel : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: cardBorder),
                          ),
                          child: Column(
                            children: [
                              _buildPeriodBtn(
                                'AM',
                                !_isPm,
                                () => setState(() => _isPm = false),
                              ),
                              _buildPeriodBtn(
                                'PM',
                                _isPm,
                                () => setState(() => _isPm = true),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // 4. Action Footer
                  Row(
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          foregroundColor: mutedColor,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                        ),
                        child: const Text(
                          'Cancel',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                      const Spacer(),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: p.ink,
                          foregroundColor: p.onInk,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 11,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () {
                          final h24 = _isPm
                              ? (_hour == 12 ? 12 : _hour + 12)
                              : (_hour == 12 ? 0 : _hour);
                          Navigator.pop(
                            context,
                            TimeOfDay(hour: h24, minute: _minute),
                          );
                        },
                        child: Text(
                          'Set Time',
                          style: AppType.sans(
                            color: p.onInk,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
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

  Widget _buildPresetChip(
    String label,
    VoidCallback onTap,
    Color bg,
    Color textColor,
    Color border,
  ) {
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
          style: AppType.sans(
            color: textColor,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildNumberColumn({
    required int value,
    required int min,
    required int max,
    int step = 1,
    required ValueChanged<int> onChanged,
    required Color textColor,
    required Color mutedColor,
  }) {
    return Column(
      children: [
        IconButton(
          icon: AppIcon(SpiderIcons.chevronUp, color: mutedColor, size: 24),
          onPressed: () {
            int next = value + step;
            if (next > max) next = min;
            onChanged(next);
          },
          constraints: const BoxConstraints(),
          padding: const EdgeInsets.all(2),
        ),
        Text(
          value.toString().padLeft(2, '0'),
          style: AppType.sans(
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: textColor,
          ),
        ),
        IconButton(
          icon: AppIcon(SpiderIcons.chevronDown, color: mutedColor, size: 24),
          onPressed: () {
            int prev = value - step;
            if (prev < min) prev = max;
            onChanged(prev);
          },
          constraints: const BoxConstraints(),
          padding: const EdgeInsets.all(2),
        ),
      ],
    );
  }

  Widget _buildPeriodBtn(String text, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 130),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.muted : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          text,
          style: AppType.sans(
            color: isSelected ? Colors.black : AppColors.muted,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
