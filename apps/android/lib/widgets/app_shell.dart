import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../design/icons.dart';
import '../core/app_theme.dart';
import '../design/tokens.dart';
import '../core/helpers.dart';
import '../models/models.dart';
import '../screens/archive_screen.dart';
import '../screens/board_screen.dart';
import '../screens/calendar_screen.dart';
import '../state/board_provider.dart';
import 'quick_capture_sheet.dart';
import 'quick_search_sheet.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  int _tabIndex = 0; // 0: Board/Home, 1: Cold Store, 2: Dumping Bin, 3: Calendar
  bool _isNavVisible = true;
  bool _showSpeedDial = false;
  Timer? _scrollEndTimer;

  @override
  void dispose() {
    _scrollEndTimer?.cancel();
    super.dispose();
  }

  void _handleScroll(ScrollNotification notification) {
    if (notification.metrics.axis != Axis.vertical) return;

    if (notification is ScrollStartNotification || notification is ScrollUpdateNotification) {
      if (notification is ScrollUpdateNotification && (notification.scrollDelta ?? 0).abs() < 1.0) {
        return;
      }
      _scrollEndTimer?.cancel();
      if (_showSpeedDial) {
        setState(() => _showSpeedDial = false);
      }
      if (_isNavVisible) {
        setState(() => _isNavVisible = false);
      }
      _scrollEndTimer = Timer(const Duration(milliseconds: 250), () {
        if (mounted && !_isNavVisible) {
          setState(() => _isNavVisible = true);
        }
      });
    } else if (notification is ScrollEndNotification ||
        (notification is UserScrollNotification && notification.direction == ScrollDirection.idle)) {
      _scrollEndTimer?.cancel();
      if (!_isNavVisible) {
        setState(() => _isNavVisible = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final dockBg = isDark ? const Color(0xF5000000) : const Color(0xF8FFFFFF);
    final dockBorder = isDark ? AppColors.line : AppColors.lightLine;
    final activeIconColor = isDark ? AppColors.ink : AppColors.lightInk;
    final mutedIconColor = isDark ? AppColors.muted : AppColors.lightMuted;

    final board = ref.watch(boardProvider);
    final data = board.data;

    final coldCount = (data?.clusters.where((c) => c.status == ClusterStatus.cold).length ?? 0) +
        (data?.tasks.where((t) => t.cold && !t.binned).length ?? 0);
    final binCount = (data?.clusters.where((c) => c.status == ClusterStatus.binned).length ?? 0) +
        (data?.tasks.where((t) => t.binned).length ?? 0);

    if (data == null) {
      return const BoardScreen();
    }

    return PopScope(
      canPop: !_showSpeedDial && _tabIndex == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_showSpeedDial) {
          setState(() => _showSpeedDial = false);
          return;
        }
        if (_tabIndex != 0) {
          setState(() => _tabIndex = 0);
        }
      },
      child: Scaffold(
        extendBody: true,
        body: Stack(
          children: [
            NotificationListener<ScrollNotification>(
              onNotification: (notification) {
                _handleScroll(notification);
                return false;
              },
              child: IndexedStack(
                index: _tabIndex,
                children: const [
                  BoardScreen(),
                  ArchiveScreen(initialBin: false),
                  ArchiveScreen(initialBin: true),
                  CalendarScreen(),
                ],
              ),
            ),
          if (_showSpeedDial)
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => setState(() => _showSpeedDial = false),
                child: Container(
                  color: Colors.black.withValues(alpha: isDark ? 0.6 : 0.25),
                ),
              ),
            ),
          AnimatedPositioned(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            left: 16,
            right: 16,
            bottom: _isNavVisible ? 16 : -90,
            child: SafeArea(
              top: false,
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      // 1. Navigation Pill
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(24),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                            child: Container(
                              height: 52,
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
                              decoration: BoxDecoration(
                                color: dockBg,
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: dockBorder, width: 1.0),
                              ),
                              child: Row(
                                children: [
                                  // Board Tab
                                  Expanded(
                                    child: _buildDockItem(
                                      icon: SpiderIcons.home,
                                      activeIcon: SpiderIcons.homeActive,
                                      label: 'Board',
                                      active: _tabIndex == 0,
                                      accentColor: activeIconColor,
                                      mutedColor: mutedIconColor,
                                      onTap: () {
                                        HapticFeedback.selectionClick();
                                        setState(() => _tabIndex = 0);
                                      },
                                    ),
                                  ),

                                  // Cold Store
                                  Expanded(
                                    child: DragTarget<Task>(
                                      onWillAcceptWithDetails: (_) => true,
                                      onAcceptWithDetails: (details) {
                                        final task = details.data;
                                        ref.read(boardProvider.notifier).patchTask(
                                          task.id,
                                          {'cold': true, 'binned': false},
                                          (t) => t.copyWith(cold: true, binned: false),
                                        );
                                        HapticFeedback.mediumImpact();
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Moved "${displayTitle(task.title)}" to Cold store'),
                                            duration: const Duration(seconds: 2),
                                          ),
                                        );
                                      },
                                      builder: (ctx, candidateData, rejectedData) {
                                        final isHovered = candidateData.isNotEmpty;
                                        return _buildDockItem(
                                          icon: SpiderIcons.coldStore,
                                          activeIcon: SpiderIcons.coldStore,
                                          label: 'Cold',
                                          active: _tabIndex == 1 || isHovered,
                                          badgeCount: coldCount,
                                          accentColor: activeIconColor,
                                          mutedColor: mutedIconColor,
                                          onTap: () {
                                            HapticFeedback.selectionClick();
                                            setState(() => _tabIndex = 1);
                                          },
                                        );
                                      },
                                    ),
                                  ),

                                  // Dumping Bin
                                  Expanded(
                                    child: DragTarget<Task>(
                                      onWillAcceptWithDetails: (_) => true,
                                      onAcceptWithDetails: (details) {
                                        final task = details.data;
                                        final now = DateTime.now().toIso8601String();
                                        ref.read(boardProvider.notifier).patchTask(
                                          task.id,
                                          {'binned': true, 'cold': false, 'binned_at': now},
                                          (t) => t.copyWith(binned: true, cold: false, binnedAt: now, binnedAtSet: true),
                                        );
                                        HapticFeedback.heavyImpact();
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Moved "${displayTitle(task.title)}" to Dumping bin'),
                                            duration: const Duration(seconds: 2),
                                          ),
                                        );
                                      },
                                      builder: (ctx, candidateData, rejectedData) {
                                        final isHovered = candidateData.isNotEmpty;
                                        return _buildDockItem(
                                          icon: SpiderIcons.dumpingBin,
                                          activeIcon: SpiderIcons.dumpingBinActive,
                                          label: 'Bin',
                                          active: _tabIndex == 2 || isHovered,
                                          badgeCount: binCount,
                                          accentColor: activeIconColor,
                                          mutedColor: mutedIconColor,
                                          onTap: () {
                                            HapticFeedback.selectionClick();
                                            setState(() => _tabIndex = 2);
                                          },
                                        );
                                      },
                                    ),
                                  ),

                                  // Search Tab
                                  Expanded(
                                    child: _buildDockItem(
                                      icon: SpiderIcons.search,
                                      activeIcon: SpiderIcons.search,
                                      label: 'Search',
                                      active: false,
                                      accentColor: activeIconColor,
                                      mutedColor: mutedIconColor,
                                      onTap: () {
                                        HapticFeedback.lightImpact();
                                        showQuickSearchSheet(context);
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // 2. Circular Floating Plus (+) Button
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          if (_showSpeedDial)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10, right: 4),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _buildSpeedDialItem(
                                    icon: Icons.mic_rounded,
                                    label: 'Voice Note',
                                    isDark: isDark,
                                    onTap: () => showQuickCaptureSheet(context, initialAction: 'voice'),
                                  ),
                                  _buildSpeedDialItem(
                                    icon: Icons.camera_alt_rounded,
                                    label: 'Camera',
                                    isDark: isDark,
                                    onTap: () => showQuickCaptureSheet(context, initialAction: 'camera'),
                                  ),
                                  _buildSpeedDialItem(
                                    icon: Icons.photo_library_rounded,
                                    label: 'Gallery',
                                    isDark: isDark,
                                    onTap: () => showQuickCaptureSheet(context, initialAction: 'gallery'),
                                  ),
                                  _buildSpeedDialItem(
                                    icon: Icons.attach_file_rounded,
                                    label: 'Document',
                                    isDark: isDark,
                                    onTap: () => showQuickCaptureSheet(context, initialAction: 'file'),
                                  ),
                                ],
                              ),
                            ),
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () {
                                HapticFeedback.lightImpact();
                                if (_showSpeedDial) {
                                  setState(() => _showSpeedDial = false);
                                } else {
                                  showQuickCaptureSheet(context);
                                }
                              },
                              onLongPress: () {
                                HapticFeedback.heavyImpact();
                                setState(() => _showSpeedDial = !_showSpeedDial);
                              },
                              borderRadius: BorderRadius.circular(26),
                              child: Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isDark ? AppColors.ink : AppColors.lightInk,
                                  border: Border.all(
                                    color: isDark ? AppColors.line : AppColors.lightLine,
                                    width: 1.0,
                                  ),
                                ),
                                child: Center(
                                  child: Icon(
                                    Icons.add_rounded,
                                    color: isDark ? AppColors.accentInk : AppColors.lightAccentInk,
                                    size: 22,
                                  ),
                                ),
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
        ],
      ),
    ),
    );
  }

  Widget _buildSpeedDialItem({
    required IconData icon,
    required String label,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: GestureDetector(
        onTap: () {
          setState(() => _showSpeedDial = false);
          onTap();
        },
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
              decoration: BoxDecoration(
                color: isDark ? AppColors.panel : AppColors.lightPanel,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: isDark ? AppColors.line : AppColors.lightLine,
                  width: 0.8,
                ),
              ),
              child: Text(
                label,
                style: GoogleFonts.inter(
                  color: isDark ? AppColors.ink : AppColors.lightInk,
                  fontWeight: FontWeight.w500,
                  fontSize: 11.5,
                ),
              ),
            ),
            const SizedBox(width: 6),
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                border: Border.all(color: isDark ? AppColors.line : AppColors.lightLine, width: 1.0),
              ),
              child: Center(
                child: Icon(icon, color: isDark ? AppColors.ink : AppColors.lightInk, size: 18),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDockItem({
    required IconData icon,
    required IconData activeIcon,
    required String label,
    required bool active,
    required Color accentColor,
    required Color mutedColor,
    int badgeCount = 0,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 44,
          margin: const EdgeInsets.symmetric(horizontal: 1),
          decoration: BoxDecoration(
            color: active
                ? (isDark ? AppColors.panel2 : AppColors.lightPanel2)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
          ),
          alignment: Alignment.center,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.center,
                children: [
                  Icon(
                    active ? activeIcon : icon,
                    size: 16,
                    color: active ? accentColor : mutedColor,
                  ),
                  if (badgeCount > 0)
                    Positioned(
                      top: -3,
                      right: -7,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 0.5),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.panel3 : AppColors.lightPanel3,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: isDark ? AppColors.line : AppColors.lightLine,
                            width: 0.8,
                          ),
                        ),
                        constraints: const BoxConstraints(minWidth: 12, minHeight: 12),
                        child: Text(
                          badgeCount > 99 ? '99+' : '$badgeCount',
                          style: TextStyle(
                            color: isDark ? AppColors.ink : AppColors.lightInk,
                            fontSize: 7.5,
                            fontWeight: FontWeight.w600,
                            fontFamily: 'monospace',
                            height: 1.0,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: GoogleFonts.inter(
                  color: active ? accentColor : mutedColor,
                  fontSize: 9,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                  height: 1.0,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
