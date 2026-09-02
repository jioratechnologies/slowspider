/// ═══════════════════════════════════════════════════════════════════════════
/// SLOW SPIDER · Design Tokens
///
/// One accent, four steps of surface, and a hairline. Everything else is ink.
/// Colour carries meaning only where meaning exists: gold marks what you chose
/// to care about, red marks what has slipped, and a cluster's own hue marks
/// which cluster a task belongs to. Nothing else is allowed a hue.
///
/// Reach for these through `context.ink` rather than branching on brightness —
/// the palette resolves itself.
/// ═══════════════════════════════════════════════════════════════════════════
library;

import 'package:flutter/material.dart';

/// The resolved colour set for one brightness.
@immutable
class SpiderPalette {
  /// The page itself.
  final Color bg;

  /// Cards, rows and list surfaces sitting on [bg].
  final Color surface;

  /// Controls and chips sitting on [surface].
  final Color surfaceAlt;

  /// Menus, sheets and dialogs floating above everything.
  final Color overlay;

  /// The default hairline. Should almost disappear.
  final Color line;

  /// A rule that needs to be seen — control borders, dividers under pressure.
  final Color lineStrong;

  /// Primary text and active iconography.
  final Color ink;

  /// Secondary text, resting icons, metadata.
  final Color inkMuted;

  /// Tertiary text, placeholders, disabled.
  final Color inkFaint;

  /// Warm gold. Starred items and focus. Used sparingly, by design.
  final Color gold;

  /// Gold at low alpha, for fills behind gold marks.
  final Color goldSoft;

  /// Overdue and destructive.
  final Color danger;

  /// Danger at low alpha.
  final Color dangerSoft;

  /// Ink for text sitting on a filled [ink] or [gold] surface.
  final Color onInk;

  const SpiderPalette({
    required this.bg,
    required this.surface,
    required this.surfaceAlt,
    required this.overlay,
    required this.line,
    required this.lineStrong,
    required this.ink,
    required this.inkMuted,
    required this.inkFaint,
    required this.gold,
    required this.goldSoft,
    required this.danger,
    required this.dangerSoft,
    required this.onInk,
  });

  /// Deep monochrome — near-black with a warm white ink, so the serif has
  /// something to breathe against.
  static const dark = SpiderPalette(
    bg: Color(0xFF09090A),
    surface: Color(0xFF0F0F11),
    surfaceAlt: Color(0xFF161619),
    overlay: Color(0xFF1B1B1F),
    line: Color(0xFF1E1E23),
    lineStrong: Color(0xFF2C2C33),
    ink: Color(0xFFF2F1EE),
    inkMuted: Color(0xFF97969C),
    inkFaint: Color(0xFF5A595F),
    gold: Color(0xFFC8A55C),
    goldSoft: Color(0x1FC8A55C),
    danger: Color(0xFFD9564C),
    dangerSoft: Color(0x1FD9564C),
    onInk: Color(0xFF09090A),
  );

  /// Warm paper — never pure white, so the gold still reads as gold rather
  /// than as yellow.
  static const light = SpiderPalette(
    bg: Color(0xFFFBFAF8),
    surface: Color(0xFFFFFFFF),
    surfaceAlt: Color(0xFFF4F3F0),
    overlay: Color(0xFFFFFFFF),
    line: Color(0xFFE9E7E2),
    lineStrong: Color(0xFFD6D3CC),
    ink: Color(0xFF17161A),
    inkMuted: Color(0xFF5F5E65),
    inkFaint: Color(0xFF8E8C93),
    gold: Color(0xFF937229),
    goldSoft: Color(0x1F937229),
    danger: Color(0xFFB8402F),
    dangerSoft: Color(0x14B8402F),
    onInk: Color(0xFFFBFAF8),
  );

  SpiderPalette lerpTo(SpiderPalette o, double t) => SpiderPalette(
    bg: Color.lerp(bg, o.bg, t)!,
    surface: Color.lerp(surface, o.surface, t)!,
    surfaceAlt: Color.lerp(surfaceAlt, o.surfaceAlt, t)!,
    overlay: Color.lerp(overlay, o.overlay, t)!,
    line: Color.lerp(line, o.line, t)!,
    lineStrong: Color.lerp(lineStrong, o.lineStrong, t)!,
    ink: Color.lerp(ink, o.ink, t)!,
    inkMuted: Color.lerp(inkMuted, o.inkMuted, t)!,
    inkFaint: Color.lerp(inkFaint, o.inkFaint, t)!,
    gold: Color.lerp(gold, o.gold, t)!,
    goldSoft: Color.lerp(goldSoft, o.goldSoft, t)!,
    danger: Color.lerp(danger, o.danger, t)!,
    dangerSoft: Color.lerp(dangerSoft, o.dangerSoft, t)!,
    onInk: Color.lerp(onInk, o.onInk, t)!,
  );
}

/// Spacing scale. Four-point base; the half-steps exist because dense list
/// rows genuinely need them, not as an escape hatch.
abstract final class Space {
  static const xxs = 2.0;
  static const xs = 4.0;
  static const sm = 6.0;
  static const md = 8.0;
  static const lg = 12.0;
  static const xl = 16.0;
  static const xxl = 20.0;
  static const x3 = 24.0;
  static const x4 = 32.0;
  static const x5 = 40.0;
  static const x6 = 48.0;

  /// The screen gutter used by every scrolling surface.
  static const gutter = 18.0;

  /// How far a task row is indented past its cluster's spine. Everything that
  /// belongs to a cluster sits at this offset, and nothing else does.
  static const spineIndent = 22.0;
}

abstract final class Radii {
  static const xs = 4.0;
  static const sm = 7.0;
  static const md = 10.0;
  static const lg = 14.0;
  static const xl = 20.0;
  static const pill = 999.0;

  static const brXs = BorderRadius.all(Radius.circular(xs));
  static const brSm = BorderRadius.all(Radius.circular(sm));
  static const brMd = BorderRadius.all(Radius.circular(md));
  static const brLg = BorderRadius.all(Radius.circular(lg));
  static const brXl = BorderRadius.all(Radius.circular(xl));
  static const brPill = BorderRadius.all(Radius.circular(pill));
}

/// Motion. Short, and always decelerating — nothing here should feel thrown.
abstract final class Motion {
  static const instant = Duration(milliseconds: 90);
  static const fast = Duration(milliseconds: 140);
  static const base = Duration(milliseconds: 200);
  static const slow = Duration(milliseconds: 320);

  static const curve = Curves.easeOutCubic;
  static const enter = Curves.easeOutQuint;
  static const inOut = Curves.easeInOutCubic;
}

abstract final class Strokes {
  static const hair = 1.0;
  static const border = 1.0;

  /// The cluster spine. Thick enough to read as a deliberate connector rather
  /// than as a stray divider.
  static const spine = 2.0;
}

/// Cluster identity colours. Muted and desaturated so a board full of them
/// still reads as monochrome from arm's length — the hue is an identifier,
/// not decoration.
const List<String> clusterColors = [
  '#9A8358', // sand
  '#6E8A76', // sage
  '#5F7F92', // slate blue
  '#7B7396', // muted violet
  '#96707E', // dusty rose
  '#A07B5C', // clay
  '#7D8A5E', // olive
  '#5E8388', // teal grey
  '#8E7B96', // heather
  '#A08262', // caramel
  '#6B7D9A', // steel
  '#8A8A72', // moss grey
];

/// Resolve a `#RRGGBB` string to a [Color].
Color colorFromHex(String hex) {
  var h = hex.replaceFirst('#', '').trim();
  if (h.length == 6) h = 'FF$h';
  if (h.length != 8) return const Color(0xFF9A8358);
  return Color(int.tryParse(h, radix: 16) ?? 0xFF9A8358);
}

/// Carries the palette through [ThemeData] so widgets never branch on
/// brightness themselves.
@immutable
class SpiderTheme extends ThemeExtension<SpiderTheme> {
  final SpiderPalette palette;
  const SpiderTheme({required this.palette});

  @override
  SpiderTheme copyWith({SpiderPalette? palette}) =>
      SpiderTheme(palette: palette ?? this.palette);

  @override
  SpiderTheme lerp(ThemeExtension<SpiderTheme>? other, double t) {
    if (other is! SpiderTheme) return this;
    return SpiderTheme(palette: palette.lerpTo(other.palette, t));
  }
}

/// `context.ink.gold` — the only way widgets should reach for colour.
extension SpiderPaletteContext on BuildContext {
  SpiderPalette get ink {
    final ext = Theme.of(this).extension<SpiderTheme>();
    if (ext != null) return ext.palette;
    return Theme.of(this).brightness == Brightness.dark
        ? SpiderPalette.dark
        : SpiderPalette.light;
  }

  bool get isDarkTheme => Theme.of(this).brightness == Brightness.dark;
}
