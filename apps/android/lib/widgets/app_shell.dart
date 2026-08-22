import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_theme.dart';
import '../models/models.dart';
import '../screens/archive_screen.dart';
import '../screens/board_screen.dart';
import '../screens/calendar_screen.dart';
import '../state/board_provider.dart';
import 'quick_capture_sheet.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  int _tabIndex = 0; // 0: Board/Home, 1: Cold Store, 2: Dumping Bin, 3: Calendar

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final dockBg = isDark ? const Color(0xCC151620) : const Color(0xEBFFFFFF);
    final dockBorder = isDark ? Colors.white.withValues(alpha: 0.14) : Colors.black.withValues(alpha: 0.08);
    final shadowColor = isDark ? Colors.black.withValues(alpha: 0.45) : Colors.black.withValues(alpha: 0.1);
    final mutedIconColor = isDark ? AppColors.muted : AppColors.lightMuted;

    final board = ref.watch(boardProvider);
    final data = board.data;

    final coldCount = (data?.clusters.where((c) => c.status == ClusterStatus.cold).length ?? 0) +
        (data?.tasks.where((t) => t.cold && !t.binned).length ?? 0);
    final binCount = (data?.clusters.where((c) => c.status == ClusterStatus.binned).length ?? 0) +
        (data?.tasks.where((t) => t.binned).length ?? 0);

    return Scaffold(
      extendBody: true,
      body: IndexedStack(
        index: _tabIndex,
        children: const [
          BoardScreen(),
          ArchiveScreen(initialBin: false),
          ArchiveScreen(initialBin: true),
          CalendarScreen(),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(32),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: dockBg,
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(
                    color: dockBorder,
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: shadowColor,
                      blurRadius: 28,
                      offset: const Offset(0, 10),
                    ),
                    BoxShadow(
                      color: const Color(0xFF8B5CF6).withValues(alpha: 0.06),
                      blurRadius: 20,
                      spreadRadius: -2,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // 1. Home / Board Tab
                    _buildNavItem(
                      icon: Icons.dashboard_outlined,
                      activeIcon: Icons.dashboard_rounded,
                      label: 'Home',
                      active: _tabIndex == 0,
                      activeColor: AppColors.accent,
                      mutedColor: mutedIconColor,
                      onTap: () => setState(() => _tabIndex = 0),
                    ),

                    // 2. Cold Store Tab
                    _buildNavItem(
                      icon: Icons.ac_unit_rounded,
                      activeIcon: Icons.ac_unit_rounded,
                      label: 'Cold',
                      active: _tabIndex == 1,
                      badgeCount: coldCount,
                      activeColor: const Color(0xFF38BDF8),
                      mutedColor: mutedIconColor,
                      onTap: () => setState(() => _tabIndex = 1),
                    ),

                    // 3. Central Prominent Liquid Glass '+ Add' Button
                    GestureDetector(
                      onTap: () => showQuickCaptureSheet(context),
                      child: Container(
                        width: 46,
                        height: 46,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isDark
                                ? const [Color(0xFF3B3E52), Color(0xFF202330)]
                                : const [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isDark ? Colors.white.withValues(alpha: 0.22) : const Color(0xFFA78BFA),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: isDark ? Colors.black.withValues(alpha: 0.4) : const Color(0xFF8B5CF6).withValues(alpha: 0.35),
                              blurRadius: 12,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.add_rounded, color: Colors.white, size: 24),
                      ),
                    ),

                    // 4. Dumping Bin Tab
                    _buildNavItem(
                      icon: Icons.delete_outline_rounded,
                      activeIcon: Icons.delete_rounded,
                      label: 'Bin',
                      active: _tabIndex == 2,
                      badgeCount: binCount,
                      activeColor: AppColors.danger,
                      mutedColor: mutedIconColor,
                      onTap: () => setState(() => _tabIndex = 2),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required IconData activeIcon,
    required String label,
    required bool active,
    required Color activeColor,
    required Color mutedColor,
    int badgeCount = 0,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        decoration: BoxDecoration(
          color: active ? activeColor.withValues(alpha: 0.14) : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  active ? activeIcon : icon,
                  size: 20,
                  color: active ? activeColor : mutedColor,
                ),
                if (badgeCount > 0)
                  Positioned(
                    top: -4,
                    right: -8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: activeColor,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: isDark ? const Color(0xFF14151C) : Colors.white, width: 1.5),
                      ),
                      constraints: const BoxConstraints(minWidth: 15, minHeight: 15),
                      child: Text(
                        '$badgeCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                color: active ? activeColor : mutedColor,
                fontSize: 10.5,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                letterSpacing: -0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
