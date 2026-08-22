import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../screens/archive_screen.dart';
import '../screens/board_screen.dart';
import '../screens/calendar_screen.dart';

/// Bottom-tab shell. apps/mobile's CustomTabBar.tsx also had "Cold"/"Research" tabs, but
/// those rendered a literal "(Coming Soon)" placeholder in the RN app — not real features —
/// so this pass keeps only the three tabs that are actually implemented: Board, Calendar,
/// Archive (cold store + bin).
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  static const _screens = [BoardScreen(), CalendarScreen(), ArchiveScreen()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        backgroundColor: AppColors.panel,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Board'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today_outlined), activeIcon: Icon(Icons.calendar_today), label: 'Calendar'),
          BottomNavigationBarItem(icon: Icon(Icons.archive_outlined), activeIcon: Icon(Icons.archive), label: 'Archive'),
        ],
      ),
    );
  }
}
