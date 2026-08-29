import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/models.dart';
import '../state/theme_provider.dart';

class AppColors {
  // Dark monochrome e-ink palette
  static const bg = Color(0xFF000000);
  static const panel = Color(0xFF0D0D0E);
  static const panel2 = Color(0xFF161618);
  static const panel3 = Color(0xFF222226);
  static const ink = Color(0xFFF4F4F5);
  static const muted = Color(0xFF8E8E93);
  static const ink3 = Color(0xFF55555C);
  static const line = Color(0xFF1E1E22);
  static const lineStrong = Color(0xFF2C2C32);
  static const accent = Color(0xFFF4F4F5);
  static const accentLight = Color(0xFFFFFFFF);
  static const accentInk = Color(0xFF000000);
  static const high = Color(0xFFF4F4F5);
  static const med = Color(0xFFA1A1AA);
  static const low = Color(0xFF71717A);
  static const none = Color(0xFF3F3F46);
  static const star = Color(0xFFF4F4F5);
  static const danger = Color(0xFFF43F5E);

  // Light monochrome e-ink palette
  static const lightBg = Color(0xFFFFFFFF);
  static const lightPanel = Color(0xFFFAFAFB);
  static const lightPanel2 = Color(0xFFF2F2F5);
  static const lightPanel3 = Color(0xFFE5E5EA);
  static const lightInk = Color(0xFF000000);
  static const lightMuted = Color(0xFF686872);
  static const lightInk3 = Color(0xFFA0A0AB);
  static const lightLine = Color(0xFFE8E8ED);
  static const lightLineStrong = Color(0xFFD4D4DC);
  static const lightAccent = Color(0xFF000000);
  static const lightAccentInk = Color(0xFFFFFFFF);

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

// Minimal cluster palette
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
      seedColor: AppColors.lightAccent,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.lightAccent,
      onPrimary: AppColors.lightAccentInk,
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
        backgroundColor: AppColors.lightBg,
        foregroundColor: AppColors.lightInk,
        elevation: 0,
        titleTextStyle: GoogleFonts.inter(color: AppColors.lightInk, fontSize: 17, fontWeight: FontWeight.w600),
      ),
      cardColor: AppColors.lightPanel,
      cardTheme: const CardThemeData(color: AppColors.lightPanel, elevation: 0),
      dividerColor: AppColors.lightLine,
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.lightPanel,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.lightLine)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.lightLine)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.lightAccent, width: 1.2)),
        labelStyle: GoogleFonts.inter(color: AppColors.lightMuted),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.lightAccent,
          foregroundColor: AppColors.lightAccentInk,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(vertical: 12),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13.5),
          elevation: 0,
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: AppColors.lightPanel2,
        selectedColor: AppColors.lightAccent,
        labelStyle: GoogleFonts.inter(color: AppColors.lightInk, fontSize: 11.5, fontWeight: FontWeight.w500),
        side: const BorderSide(color: AppColors.lightLine),
      ),
    );
  }

  // Dark Mode (Monochrome E-Ink Pitch Black)
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
      backgroundColor: AppColors.bg,
      foregroundColor: AppColors.ink,
      elevation: 0,
      titleTextStyle: GoogleFonts.inter(color: AppColors.ink, fontSize: 17, fontWeight: FontWeight.w600),
    ),
    cardColor: AppColors.panel,
    cardTheme: const CardThemeData(color: AppColors.panel, elevation: 0),
    dividerColor: AppColors.line,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.panel,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.line)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.accent, width: 1.2)),
      labelStyle: GoogleFonts.inter(color: AppColors.muted),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.accent,
        foregroundColor: AppColors.accentInk,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(vertical: 12),
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13.5),
        elevation: 0,
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(backgroundColor: AppColors.accent, foregroundColor: AppColors.accentInk),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: AppColors.panel2,
      selectedColor: AppColors.accent,
      labelStyle: GoogleFonts.inter(color: AppColors.ink, fontSize: 11.5, fontWeight: FontWeight.w500),
      side: const BorderSide(color: AppColors.line),
    ),
    snackBarTheme: const SnackBarThemeData(backgroundColor: AppColors.panel2, contentTextStyle: TextStyle(color: AppColors.ink)),
  );
}
