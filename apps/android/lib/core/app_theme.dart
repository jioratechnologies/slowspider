// Mirrors apps/mobile/src/theme.ts — neutral cool-gray dark surfaces with a violet primary.

import 'package:flutter/material.dart';

import '../models/models.dart';

class AppColors {
  static const bg = Color(0xFF0E0F13);
  static const panel = Color(0xFF1A1B20);
  static const panel2 = Color(0xFF26272E);
  static const ink = Color(0xFFF2F3F5);
  static const muted = Color(0xFFA8ACB8);
  static const ink3 = Color(0xFF787D8A);
  static const line = Color(0xFF26272E);
  static const lineStrong = Color(0xFF3C3E48);
  static const accent = Color(0xFF9B8CFA);
  static const accentInk = Color(0xFF211A4D);
  static const high = Color(0xFFF2687A);
  static const med = Color(0xFFE8A23F);
  static const low = Color(0xFF7FB6D9);
  static const none = Color(0xFF3C3E48);
  static const star = Color(0xFFF2C94C);
  static const danger = Color(0xFFF2687A);

  static Color forPriority(Priority p) {
    switch (p) {
      case Priority.high:
        return high;
      case Priority.med:
        return med;
      case Priority.low:
        return low;
      case Priority.none:
        return none;
    }
  }
}

// Same palette web assigns new clusters from (src/lib/board-helpers.ts).
const List<String> clusterColors = [
  '#6b7a5e', '#4c9a8a', '#4f8f5a', '#8a9a4e', '#6f8fa6', '#3f8fb0', '#5b6bb0', '#8a6ea6',
  '#a05a86', '#b06f8a', '#c0563f', '#b0574f', '#c17f4a', '#c99a3f', '#b58a3f', '#9a7b53',
  '#7d8891', '#5f7d6a',
];

Color colorFromHex(String hex) {
  var h = hex.replaceFirst('#', '');
  if (h.length == 6) h = 'FF$h';
  return Color(int.parse(h, radix: 16));
}

ThemeData buildAppTheme() {
  final base = ThemeData.dark(useMaterial3: true);
  final colorScheme = ColorScheme.fromSeed(
    seedColor: AppColors.accent,
    brightness: Brightness.dark,
  ).copyWith(
    primary: AppColors.accent,
    onPrimary: AppColors.accentInk,
    secondary: const Color(0xFF8FC9BB),
    surface: AppColors.bg,
    onSurface: AppColors.ink,
    surfaceContainerHighest: AppColors.panel2,
    error: AppColors.danger,
    outline: AppColors.lineStrong,
    outlineVariant: AppColors.line,
  );

  return base.copyWith(
    colorScheme: colorScheme,
    scaffoldBackgroundColor: AppColors.bg,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.panel,
      foregroundColor: AppColors.ink,
      elevation: 0,
      titleTextStyle: TextStyle(color: AppColors.ink, fontSize: 19, fontWeight: FontWeight.w600),
    ),
    cardColor: AppColors.panel,
    cardTheme: const CardThemeData(color: AppColors.panel, elevation: 0),
    dividerColor: AppColors.lineStrong,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.panel,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.lineStrong)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.lineStrong)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.accent)),
      labelStyle: const TextStyle(color: AppColors.muted),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.accent,
        foregroundColor: AppColors.accentInk,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(vertical: 14),
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(backgroundColor: AppColors.accent, foregroundColor: AppColors.accentInk),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: AppColors.panel2,
      selectedColor: AppColors.accent,
      labelStyle: const TextStyle(color: AppColors.ink),
      side: const BorderSide(color: AppColors.lineStrong),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.panel,
      selectedItemColor: AppColors.accent,
      unselectedItemColor: AppColors.ink3,
    ),
    snackBarTheme: const SnackBarThemeData(backgroundColor: AppColors.panel2, contentTextStyle: TextStyle(color: AppColors.ink)),
    textTheme: base.textTheme.apply(bodyColor: AppColors.ink, displayColor: AppColors.ink),
  );
}
