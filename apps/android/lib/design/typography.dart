/// ═══════════════════════════════════════════════════════════════════════════
/// SLOW SPIDER · Typography
///
/// Three bundled families, each with one job:
///
///   Instrument Serif  — the voice. Screen titles, cluster names, empty states.
///                       One weight only; its character is in the letterforms,
///                       not the mass.
///   Geist             — the interface. Every label, control and body run.
///   Geist Mono        — the measurements. Counts, dates, progress, code.
///
/// Numerals live in the mono face throughout. A count that changes width as it
/// ticks from 9 to 10 is the kind of small wrongness that makes an app feel
/// unconsidered, and tabular figures cost nothing to adopt.
/// ═══════════════════════════════════════════════════════════════════════════
library;

import 'package:flutter/material.dart';

abstract final class FontFamilies {
  static const serif = 'InstrumentSerif';
  static const sans = 'Geist';
  static const mono = 'GeistMono';

  /// Keeps CJK and emoji legible where the bundled faces lack coverage.
  static const fallback = <String>['Noto Sans', 'Roboto'];
}

abstract final class AppType {
  // ── Compatibility constructors ──
  // These mirror the shape of the call sites they replaced, so swapping the
  // family never became a 258-site rewrite. Prefer the named ramp below.

  /// Geist. The default interface face.
  static TextStyle sans({
    Color? color,
    double? fontSize,
    FontWeight? fontWeight,
    FontStyle? fontStyle,
    double? letterSpacing,
    double? wordSpacing,
    double? height,
    TextDecoration? decoration,
    Color? decorationColor,
    TextDecorationStyle? decorationStyle,
    double? decorationThickness,
    Color? backgroundColor,
    List<Shadow>? shadows,
    Paint? foreground,
    Paint? background,
    TextBaseline? textBaseline,
    TextOverflow? overflow,
    List<FontFeature>? fontFeatures,
  }) => TextStyle(
    fontFamily: FontFamilies.sans,
    fontFamilyFallback: FontFamilies.fallback,
    color: color,
    fontSize: fontSize,
    fontWeight: fontWeight,
    fontStyle: fontStyle,
    letterSpacing: letterSpacing,
    wordSpacing: wordSpacing,
    height: height,
    decoration: decoration,
    decorationColor: decorationColor,
    decorationStyle: decorationStyle,
    decorationThickness: decorationThickness,
    backgroundColor: backgroundColor,
    shadows: shadows,
    foreground: foreground,
    background: background,
    textBaseline: textBaseline,
    overflow: overflow,
    fontFeatures: fontFeatures,
  );

  /// Geist Mono. Numerals, timestamps, counts, code.
  static TextStyle mono({
    Color? color,
    double? fontSize,
    FontWeight? fontWeight,
    FontStyle? fontStyle,
    double? letterSpacing,
    double? wordSpacing,
    double? height,
    TextDecoration? decoration,
    Color? decorationColor,
    TextDecorationStyle? decorationStyle,
    double? decorationThickness,
    Color? backgroundColor,
    List<Shadow>? shadows,
    Paint? foreground,
    Paint? background,
    TextBaseline? textBaseline,
    TextOverflow? overflow,
    List<FontFeature>? fontFeatures,
  }) => TextStyle(
    fontFamily: FontFamilies.mono,
    fontFamilyFallback: FontFamilies.fallback,
    color: color,
    fontSize: fontSize,
    fontWeight: fontWeight,
    fontStyle: fontStyle,
    letterSpacing: letterSpacing,
    wordSpacing: wordSpacing,
    height: height,
    decoration: decoration,
    decorationColor: decorationColor,
    decorationStyle: decorationStyle,
    decorationThickness: decorationThickness,
    backgroundColor: backgroundColor,
    shadows: shadows,
    foreground: foreground,
    background: background,
    textBaseline: textBaseline,
    overflow: overflow,
    fontFeatures: fontFeatures,
  );

  /// Instrument Serif. Ships in a single weight — any requested [fontWeight] is
  /// deliberately ignored rather than letting the engine fake a bold.
  static TextStyle serif({
    Color? color,
    double? fontSize,
    FontWeight? fontWeight,
    FontStyle? fontStyle,
    double? letterSpacing,
    double? wordSpacing,
    double? height,
    TextDecoration? decoration,
    Color? decorationColor,
    TextDecorationStyle? decorationStyle,
    double? decorationThickness,
    Color? backgroundColor,
    List<Shadow>? shadows,
    Paint? foreground,
    Paint? background,
    TextBaseline? textBaseline,
    TextOverflow? overflow,
    List<FontFeature>? fontFeatures,
  }) => TextStyle(
    fontFamily: FontFamilies.serif,
    fontFamilyFallback: FontFamilies.fallback,
    color: color,
    fontSize: fontSize,
    fontWeight: FontWeight.w400,
    fontStyle: fontStyle,
    letterSpacing: letterSpacing,
    wordSpacing: wordSpacing,
    height: height,
    decoration: decoration,
    decorationColor: decorationColor,
    decorationStyle: decorationStyle,
    decorationThickness: decorationThickness,
    backgroundColor: backgroundColor,
    shadows: shadows,
    foreground: foreground,
    background: background,
    textBaseline: textBaseline,
    overflow: overflow,
    fontFeatures: fontFeatures,
  );

  // ── The ramp. Use these. ──

  /// 34px serif. One per screen at most — sign-in, empty states.
  static TextStyle display([Color? c]) =>
      serif(color: c, fontSize: 34, height: 1.08, letterSpacing: -0.6);

  /// 26px serif. Screen titles.
  static TextStyle title([Color? c]) =>
      serif(color: c, fontSize: 26, height: 1.14, letterSpacing: -0.4);

  /// 20px serif. Section and sheet headings.
  static TextStyle heading([Color? c]) =>
      serif(color: c, fontSize: 20, height: 1.20, letterSpacing: -0.25);

  /// 16.5px serif. Cluster names, card titles, dialog headings.
  static TextStyle subhead([Color? c]) =>
      serif(color: c, fontSize: 16.5, height: 1.28, letterSpacing: -0.1);

  /// 10.5px sans, uppercase, wide. Pair with `.toUpperCase()`.
  static TextStyle eyebrow([Color? c]) => sans(
    color: c,
    fontSize: 10.5,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.1,
    height: 1.2,
  );

  /// 15.5px sans. Long-form reading — note bodies.
  static TextStyle bodyLg([Color? c]) =>
      sans(color: c, fontSize: 15.5, height: 1.5);

  /// 14.5px sans. The default. Task titles, paragraphs.
  static TextStyle body([Color? c]) =>
      sans(color: c, fontSize: 14.5, height: 1.45);

  /// 14.5px sans, medium. A body run that needs to lead.
  static TextStyle bodyStrong([Color? c]) =>
      sans(color: c, fontSize: 14.5, fontWeight: FontWeight.w500, height: 1.45);

  /// 13px sans, medium. Buttons, menu rows, field labels.
  static TextStyle label([Color? c]) =>
      sans(color: c, fontSize: 13, fontWeight: FontWeight.w500, height: 1.35);

  /// 11.5px sans, medium. Chips, badges, dock labels.
  static TextStyle labelSm([Color? c]) =>
      sans(color: c, fontSize: 11.5, fontWeight: FontWeight.w500, height: 1.3);

  /// 11px sans. Helper text and hints.
  static TextStyle caption([Color? c]) =>
      sans(color: c, fontSize: 11, height: 1.3);

  /// 11.5px mono. Counts, fractions, relative dates — anything that ticks.
  static TextStyle numeric([Color? c]) => mono(
    color: c,
    fontSize: 11.5,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.2,
    height: 1.2,
  );

  /// 13px mono. A figure given prominence.
  static TextStyle numericLg([Color? c]) => mono(
    color: c,
    fontSize: 13,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.2,
    height: 1.2,
  );

  /// 12.5px mono. Code blocks and formulae.
  static TextStyle code([Color? c]) =>
      mono(color: c, fontSize: 12.5, height: 1.5);

  /// The [TextTheme] handed to [ThemeData], mapping Material's slots onto the
  /// ramp so unstyled widgets still land inside the system.
  static TextTheme textTheme(Color ink, Color muted) => TextTheme(
    displayLarge: display(ink),
    displayMedium: display(ink),
    displaySmall: title(ink),
    headlineLarge: title(ink),
    headlineMedium: heading(ink),
    headlineSmall: heading(ink),
    titleLarge: subhead(ink),
    titleMedium: subhead(ink),
    titleSmall: bodyStrong(ink),
    bodyLarge: bodyLg(ink),
    bodyMedium: body(ink),
    bodySmall: caption(muted),
    labelLarge: label(ink),
    labelMedium: labelSm(muted),
    labelSmall: caption(muted),
  );
}
