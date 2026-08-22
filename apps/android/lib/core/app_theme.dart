import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/models.dart';
import '../state/theme_provider.dart';

class AppColors {
  // Dark palette
  static const bg = Color(0xFF0D0E12);
  static const panel = Color(0xFF16171E);
  static const panel2 = Color(0xFF1E202A);
  static const panel3 = Color(0xFF262836);
  static const ink = Color(0xFFF3F4F6);
  static const muted = Color(0xFFA1A5B4);
  static const ink3 = Color(0xFF6B7280);
  static const line = Color(0xFF222430);
  static const lineStrong = Color(0xFF323544);
  static const accent = Color(0xFF8B5CF6);
  static const accentLight = Color(0xFFA78BFA);
  static const accentInk = Color(0xFF1E1438);
  static const high = Color(0xFFF43F5E);
  static const med = Color(0xFFF59E0B);
  static const low = Color(0xFF38BDF8);
  static const none = Color(0xFF4B5563);
  static const star = Color(0xFFFBBF24);
  static const danger = Color(0xFFF43F5E);

  // Light palette
  static const lightBg = Color(0xFFF9FAFB);
  static const lightPanel = Color(0xFFFFFFFF);
  static const lightPanel2 = Color(0xFFF3F4F6);
  static const lightPanel3 = Color(0xFFE5E7EB);
  static const lightInk = Color(0xFF111827);
  static const lightMuted = Color(0xFF4B5563);
  static const lightInk3 = Color(0xFF9CA3AF);
  static const lightLine = Color(0xFFE5E7EB);
  static const lightLineStrong = Color(0xFFD1D5DB);

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

// Palette web assigns new clusters from (src/lib/board-helpers.ts).
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

ThemeData buildAppTheme({AppThemeMode mode = AppThemeMode.auto, Brightness platformBrightness = Brightness.dark}) {
  final isLight = mode == AppThemeMode.light || (mode == AppThemeMode.auto && platformBrightness == Brightness.light);

  if (isLight) {
    final base = ThemeData.light(useMaterial3: true);
    final textTheme = GoogleFonts.interTextTheme(base.textTheme).apply(
      bodyColor: AppColors.lightInk,
      displayColor: AppColors.lightInk,
    );

    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.accent,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.accent,
      onPrimary: Colors.white,
      surface: AppColors.lightBg,
      onSurface: AppColors.lightInk,
      surfaceContainerHighest: AppColors.lightPanel2,
      error: AppColors.danger,
      outline: AppColors.lightLineStrong,
      outlineVariant: AppColors.lightLine,
    );

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.lightBg,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.lightPanel,
        foregroundColor: AppColors.lightInk,
        elevation: 0,
        titleTextStyle: GoogleFonts.inter(color: AppColors.lightInk, fontSize: 18, fontWeight: FontWeight.w700),
      ),
      cardColor: AppColors.lightPanel,
      cardTheme: const CardThemeData(color: AppColors.lightPanel, elevation: 0),
      dividerColor: AppColors.lightLine,
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.lightPanel2,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.lightLine)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.lightLine)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.accent, width: 1.5)),
        labelStyle: GoogleFonts.inter(color: AppColors.lightMuted),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(vertical: 14),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: AppColors.lightPanel2,
        selectedColor: AppColors.accent,
        labelStyle: GoogleFonts.inter(color: AppColors.lightInk, fontSize: 12, fontWeight: FontWeight.w500),
        side: const BorderSide(color: AppColors.lightLine),
      ),
    );
  }

  // Dark Mode
  final base = ThemeData.dark(useMaterial3: true);
  final textTheme = GoogleFonts.interTextTheme(base.textTheme).apply(
    bodyColor: AppColors.ink,
    displayColor: AppColors.ink,
  );

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
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.panel,
      foregroundColor: AppColors.ink,
      elevation: 0,
      titleTextStyle: GoogleFonts.inter(color: AppColors.ink, fontSize: 18, fontWeight: FontWeight.w700),
    ),
    cardColor: AppColors.panel,
    cardTheme: const CardThemeData(color: AppColors.panel, elevation: 0),
    dividerColor: AppColors.lineStrong,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.panel,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.lineStrong)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.lineStrong)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.accent, width: 1.5)),
      labelStyle: GoogleFonts.inter(color: AppColors.muted),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.accent,
        foregroundColor: AppColors.accentInk,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(vertical: 14),
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(backgroundColor: AppColors.accent, foregroundColor: AppColors.accentInk),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: AppColors.panel2,
      selectedColor: AppColors.accent,
      labelStyle: GoogleFonts.inter(color: AppColors.ink, fontSize: 12, fontWeight: FontWeight.w500),
      side: const BorderSide(color: AppColors.lineStrong),
    ),
    snackBarTheme: const SnackBarThemeData(backgroundColor: AppColors.panel2, contentTextStyle: TextStyle(color: AppColors.ink)),
  );
}
