import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppThemeMode {
  auto('Auto (System)', Icons.brightness_auto_rounded),
  dark('Dark', Icons.dark_mode_rounded),
  light('Light', Icons.light_mode_rounded);

  final String label;
  final IconData icon;
  const AppThemeMode(this.label, this.icon);
}

class ThemeNotifier extends StateNotifier<AppThemeMode> {
  ThemeNotifier() : super(AppThemeMode.auto);

  void cycleTheme() {
    switch (state) {
      case AppThemeMode.auto:
        state = AppThemeMode.dark;
        break;
      case AppThemeMode.dark:
        state = AppThemeMode.light;
        break;
      case AppThemeMode.light:
        state = AppThemeMode.auto;
        break;
    }
  }

  void setTheme(AppThemeMode mode) {
    state = mode;
  }
}

final themeProvider = StateNotifierProvider<ThemeNotifier, AppThemeMode>((ref) {
  return ThemeNotifier();
});
