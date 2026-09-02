import 'package:flutter/material.dart';

import '../design/tokens.dart';
import '../design/typography.dart';
import '../models/models.dart';
import '../state/theme_provider.dart';

export '../design/tokens.dart'
    show
        clusterColors,
        colorFromHex,
        SpiderPalette,
        SpiderTheme,
        Space,
        Radii,
        Motion,
        Strokes;

/// ═══════════════════════════════════════════════════════════════════════════
/// SLOW SPIDER · Theme
///
/// The palette of record lives in `design/tokens.dart`. [AppColors] below is a
/// flat, `const` mirror of it, kept because a great many call sites read these
/// names directly and many do so inside `const` expressions — a mirror costs
/// two dozen duplicated literals and lets the whole app re-skin without a
/// mechanical rewrite. New code should prefer `context.ink`.
///
/// Change `tokens.dart` first, then reflect it down here.
/// ═══════════════════════════════════════════════════════════════════════════
abstract final class AppColors {
  // ── Dark · deep monochrome (mirrors SpiderPalette.dark) ──
  static const bg = Color(0xFF09090A);
  static const panel = Color(0xFF0F0F11);
  static const panel2 = Color(0xFF161619);
  static const panel3 = Color(0xFF1B1B1F);
  static const ink = Color(0xFFF2F1EE);
  static const muted = Color(0xFF97969C);
  static const ink3 = Color(0xFF5A595F);
  static const line = Color(0xFF1E1E23);
  static const lineStrong = Color(0xFF2C2C33);
  static const accent = Color(0xFFF2F1EE);
  static const accentLight = Color(0xFFFFFFFF);
  static const accentInk = Color(0xFF09090A);

  /// Priority reads as a weight of ink, never as a hue — the single accent is
  /// spent on starring, and spending it twice would make neither mean anything.
  static const high = Color(0xFFF2F1EE);
  static const med = Color(0xFF97969C);
  static const low = Color(0xFF5A595F);
  static const none = Color(0x00000000);

  /// Starred. The one place gold appears at rest.
  static const star = Color(0xFFC8A55C);
  static const gold = Color(0xFFC8A55C);
  static const goldSoft = Color(0x1FC8A55C);

  static const danger = Color(0xFFD9564C);
  static const dangerSoft = Color(0x1FD9564C);

  // ── Light · warm paper (mirrors SpiderPalette.light) ──
  static const lightBg = Color(0xFFFBFAF8);
  static const lightPanel = Color(0xFFFFFFFF);
  static const lightPanel2 = Color(0xFFF4F3F0);
  static const lightPanel3 = Color(0xFFEBE9E4);
  static const lightInk = Color(0xFF17161A);
  static const lightMuted = Color(0xFF5F5E65);
  static const lightInk3 = Color(0xFF8E8C93);
  static const lightLine = Color(0xFFE9E7E2);
  static const lightLineStrong = Color(0xFFD6D3CC);
  static const lightAccent = Color(0xFF17161A);
  static const lightAccentInk = Color(0xFFFBFAF8);
  static const lightGold = Color(0xFF937229);
  static const lightDanger = Color(0xFFB8402F);

  static Color forPriority(Priority p) => switch (p) {
    Priority.high => high,
    Priority.med => med,
    Priority.low => low,
    Priority.none => none,
  };
}

/// A quieter page transition than Material's default: the incoming route rises
/// a short distance and fades, the outgoing one only fades. Nothing slides the
/// full width of the screen, because at phone size that reads as a lurch.
class _SpiderPageTransitions extends PageTransitionsBuilder {
  const _SpiderPageTransitions();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final curved = CurvedAnimation(
      parent: animation,
      curve: Motion.enter,
      reverseCurve: Motion.curve.flipped,
    );
    return FadeTransition(
      opacity: curved,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, 0.035),
          end: Offset.zero,
        ).animate(curved),
        child: child,
      ),
    );
  }
}

ThemeData buildAppTheme({
  AppThemeMode mode = AppThemeMode.auto,
  Brightness platformBrightness = Brightness.dark,
}) {
  final isLight =
      mode == AppThemeMode.light ||
      (mode == AppThemeMode.auto && platformBrightness == Brightness.light);

  final p = isLight ? SpiderPalette.light : SpiderPalette.dark;
  final brightness = isLight ? Brightness.light : Brightness.dark;
  final base = isLight ? ThemeData.light() : ThemeData.dark();
  final textTheme = AppType.textTheme(p.ink, p.inkMuted);

  final colorScheme = ColorScheme(
    brightness: brightness,
    primary: p.ink,
    onPrimary: p.onInk,
    secondary: p.gold,
    onSecondary: p.onInk,
    surface: p.bg,
    onSurface: p.ink,
    surfaceContainerLowest: p.bg,
    surfaceContainerLow: p.surface,
    surfaceContainer: p.surfaceAlt,
    surfaceContainerHigh: p.surfaceAlt,
    surfaceContainerHighest: p.overlay,
    onSurfaceVariant: p.inkMuted,
    error: p.danger,
    onError: p.onInk,
    outline: p.lineStrong,
    outlineVariant: p.line,
    shadow: const Color(0x00000000),
    scrim: Colors.black.withValues(alpha: isLight ? 0.28 : 0.62),
    inverseSurface: p.ink,
    onInverseSurface: p.bg,
  );

  OutlineInputBorder border(Color c, [double w = Strokes.border]) =>
      OutlineInputBorder(
        borderRadius: Radii.brMd,
        borderSide: BorderSide(color: c, width: w),
      );

  return base.copyWith(
    brightness: brightness,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: p.bg,
    canvasColor: p.bg,
    textTheme: textTheme,
    primaryTextTheme: textTheme,
    dividerColor: p.line,

    // Ink feedback stays almost subliminal — presence, not a splash.
    splashFactory: InkRipple.splashFactory,
    splashColor: p.ink.withValues(alpha: 0.05),
    highlightColor: p.ink.withValues(alpha: 0.03),
    hoverColor: p.ink.withValues(alpha: 0.04),
    focusColor: p.ink.withValues(alpha: 0.06),

    extensions: [SpiderTheme(palette: p)],

    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: _SpiderPageTransitions(),
        TargetPlatform.iOS: _SpiderPageTransitions(),
      },
    ),

    appBarTheme: AppBarTheme(
      backgroundColor: p.bg,
      foregroundColor: p.ink,
      surfaceTintColor: Colors.transparent,
      shadowColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      toolbarHeight: 56,
      titleTextStyle: AppType.subhead(p.ink),
      iconTheme: IconThemeData(color: p.ink, size: 20),
      actionsIconTheme: IconThemeData(color: p.ink, size: 20),
    ),

    iconTheme: IconThemeData(color: p.inkMuted, size: 18),

    cardColor: p.surface,
    cardTheme: CardThemeData(
      color: p.surface,
      surfaceTintColor: Colors.transparent,
      shadowColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: Radii.brLg,
        side: BorderSide(color: p.line, width: Strokes.border),
      ),
    ),

    dividerTheme: DividerThemeData(
      color: p.line,
      thickness: Strokes.hair,
      space: Strokes.hair,
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.surface,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: Space.lg,
        vertical: Space.lg,
      ),
      border: border(p.line),
      enabledBorder: border(p.line),
      focusedBorder: border(p.ink, 1.4),
      errorBorder: border(p.danger),
      focusedErrorBorder: border(p.danger, 1.4),
      hintStyle: AppType.body(p.inkFaint),
      labelStyle: AppType.label(p.inkMuted),
      floatingLabelStyle: AppType.label(p.ink),
      errorStyle: AppType.caption(p.danger),
      prefixIconColor: p.inkFaint,
      suffixIconColor: p.inkFaint,
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: p.ink,
        foregroundColor: p.onInk,
        disabledBackgroundColor: p.surfaceAlt,
        disabledForegroundColor: p.inkFaint,
        elevation: 0,
        shadowColor: Colors.transparent,
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: Space.xl),
        shape: const RoundedRectangleBorder(borderRadius: Radii.brMd),
        textStyle: AppType.label(),
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: p.ink,
        disabledForegroundColor: p.inkFaint,
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: Space.xl),
        side: BorderSide(color: p.lineStrong, width: Strokes.border),
        shape: const RoundedRectangleBorder(borderRadius: Radii.brMd),
        textStyle: AppType.label(),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: p.ink,
        disabledForegroundColor: p.inkFaint,
        minimumSize: const Size(0, 44),
        padding: const EdgeInsets.symmetric(horizontal: Space.lg),
        shape: const RoundedRectangleBorder(borderRadius: Radii.brSm),
        textStyle: AppType.label(),
      ),
    ),

    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(
        foregroundColor: p.inkMuted,
        minimumSize: const Size(44, 44),
        shape: const RoundedRectangleBorder(borderRadius: Radii.brSm),
      ),
    ),

    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: p.ink,
      foregroundColor: p.onInk,
      elevation: 0,
      focusElevation: 0,
      hoverElevation: 0,
      highlightElevation: 0,
      shape: const CircleBorder(),
    ),

    chipTheme: ChipThemeData(
      backgroundColor: p.surfaceAlt,
      selectedColor: p.ink,
      disabledColor: p.surface,
      side: BorderSide(color: p.line, width: Strokes.border),
      shape: const RoundedRectangleBorder(borderRadius: Radii.brSm),
      labelStyle: AppType.labelSm(p.ink),
      secondaryLabelStyle: AppType.labelSm(p.onInk),
      padding: const EdgeInsets.symmetric(
        horizontal: Space.md,
        vertical: Space.xs,
      ),
      showCheckmark: false,
    ),

    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? p.ink : Colors.transparent,
      ),
      checkColor: WidgetStatePropertyAll(p.onInk),
      side: BorderSide(color: p.lineStrong, width: 1.5),
      shape: const RoundedRectangleBorder(borderRadius: Radii.brXs),
    ),

    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? p.onInk : p.inkMuted,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? p.ink : p.surfaceAlt,
      ),
      trackOutlineColor: WidgetStatePropertyAll(p.lineStrong),
    ),

    radioTheme: RadioThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? p.ink : p.lineStrong,
      ),
    ),

    sliderTheme: SliderThemeData(
      activeTrackColor: p.ink,
      inactiveTrackColor: p.surfaceAlt,
      thumbColor: p.ink,
      overlayColor: p.ink.withValues(alpha: 0.08),
      trackHeight: 2,
    ),

    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: p.ink,
      linearTrackColor: p.surfaceAlt,
      circularTrackColor: p.surfaceAlt,
      linearMinHeight: 2,
    ),

    dialogTheme: DialogThemeData(
      backgroundColor: p.overlay,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: Radii.brXl,
        side: BorderSide(color: p.line, width: Strokes.border),
      ),
      titleTextStyle: AppType.heading(p.ink),
      contentTextStyle: AppType.body(p.inkMuted),
    ),

    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: p.overlay,
      surfaceTintColor: Colors.transparent,
      modalBackgroundColor: p.overlay,
      elevation: 0,
      modalElevation: 0,
      showDragHandle: false,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.xl)),
      ),
    ),

    popupMenuTheme: PopupMenuThemeData(
      color: p.overlay,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: Radii.brLg,
        side: BorderSide(color: p.line, width: Strokes.border),
      ),
      textStyle: AppType.label(p.ink),
    ),

    menuTheme: MenuThemeData(
      style: MenuStyle(
        backgroundColor: WidgetStatePropertyAll(p.overlay),
        surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
        elevation: const WidgetStatePropertyAll(0),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: Radii.brLg,
            side: BorderSide(color: p.line, width: Strokes.border),
          ),
        ),
      ),
    ),

    snackBarTheme: SnackBarThemeData(
      backgroundColor: p.overlay,
      contentTextStyle: AppType.label(p.ink),
      actionTextColor: p.gold,
      elevation: 0,
      behavior: SnackBarBehavior.floating,
      insetPadding: const EdgeInsets.all(Space.xl),
      shape: RoundedRectangleBorder(
        borderRadius: Radii.brMd,
        side: BorderSide(color: p.line, width: Strokes.border),
      ),
    ),

    tooltipTheme: TooltipThemeData(
      decoration: BoxDecoration(
        color: p.overlay,
        borderRadius: Radii.brSm,
        border: Border.all(color: p.line, width: Strokes.border),
      ),
      textStyle: AppType.caption(p.ink),
      padding: const EdgeInsets.symmetric(
        horizontal: Space.md,
        vertical: Space.sm,
      ),
      waitDuration: const Duration(milliseconds: 400),
    ),

    tabBarTheme: TabBarThemeData(
      labelColor: p.ink,
      unselectedLabelColor: p.inkMuted,
      labelStyle: AppType.label(),
      unselectedLabelStyle: AppType.label(),
      indicatorColor: p.ink,
      indicatorSize: TabBarIndicatorSize.label,
      dividerColor: p.line,
      overlayColor: WidgetStatePropertyAll(p.ink.withValues(alpha: 0.04)),
    ),

    listTileTheme: ListTileThemeData(
      iconColor: p.inkMuted,
      textColor: p.ink,
      titleTextStyle: AppType.body(p.ink),
      subtitleTextStyle: AppType.caption(p.inkMuted),
      shape: const RoundedRectangleBorder(borderRadius: Radii.brSm),
      contentPadding: const EdgeInsets.symmetric(horizontal: Space.lg),
    ),

    scrollbarTheme: ScrollbarThemeData(
      thickness: const WidgetStatePropertyAll(3),
      radius: const Radius.circular(Radii.pill),
      thumbColor: WidgetStatePropertyAll(p.lineStrong),
      crossAxisMargin: 2,
    ),

    textSelectionTheme: TextSelectionThemeData(
      cursorColor: p.ink,
      selectionColor: p.gold.withValues(alpha: 0.28),
      selectionHandleColor: p.gold,
    ),
  );
}
