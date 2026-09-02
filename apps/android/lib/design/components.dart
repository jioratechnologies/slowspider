/// ═══════════════════════════════════════════════════════════════════════════
/// SLOW SPIDER · Components
///
/// The shared vocabulary. If a control appears on more than one screen it
/// belongs here, so fixing it once fixes it everywhere.
///
/// Touch targets are never smaller than 44dp even where the glyph is 16dp —
/// the padding is invisible, the missed taps are not.
/// ═══════════════════════════════════════════════════════════════════════════
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'icons.dart';
import 'tokens.dart';
import 'typography.dart';

/// An icon with a guaranteed 44dp hit area and a quiet press state.
class SpiderTapIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final double size;
  final Color? color;
  final String? tooltip;
  final double hitSize;
  final bool danger;

  const SpiderTapIcon(
    this.icon, {
    super.key,
    this.onTap,
    this.size = 18,
    this.color,
    this.tooltip,
    this.hitSize = 44,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    final p = context.ink;
    final resolved = danger ? p.danger : (color ?? p.inkMuted);

    Widget child = SizedBox(
      width: hitSize,
      height: hitSize,
      child: Center(
        child: AppIcon(
          icon,
          size: size,
          color: onTap == null ? p.inkFaint : resolved,
        ),
      ),
    );

    if (onTap != null) {
      child = Material(
        color: Colors.transparent,
        shape: const RoundedRectangleBorder(borderRadius: Radii.brSm),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () {
            HapticFeedback.selectionClick();
            onTap!();
          },
          borderRadius: Radii.brSm,
          child: child,
        ),
      );
    }
    if (tooltip != null) child = Tooltip(message: tooltip!, child: child);
    return child;
  }
}

/// The task checkbox. Square with a small radius rather than a circle: a
/// circle reads as a radio button, and this is not an exclusive choice.
class SpiderCheckbox extends StatelessWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;
  final double size;

  const SpiderCheckbox({
    super.key,
    required this.value,
    this.onChanged,
    this.size = 19,
  });

  @override
  Widget build(BuildContext context) {
    final p = context.ink;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onChanged == null
          ? null
          : () {
              HapticFeedback.selectionClick();
              onChanged!(!value);
            },
      child: SizedBox(
        width: 40,
        height: 40,
        child: Center(
          child: AnimatedContainer(
            duration: Motion.instant,
            curve: Motion.curve,
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: value ? p.ink : Colors.transparent,
              borderRadius: Radii.brXs,
              border: Border.all(
                color: value ? p.ink : p.lineStrong,
                width: 1.5,
              ),
            ),
            child: value
                ? Center(
                    child: AppIcon(
                      SpiderIcons.check,
                      size: size * 0.68,
                      color: p.onInk,
                    ),
                  )
                : null,
          ),
        ),
      ),
    );
  }
}

/// The star. Gold when set — the only resting gold in the interface.
class SpiderStar extends StatelessWidget {
  final bool starred;
  final VoidCallback? onTap;
  final double size;

  const SpiderStar({
    super.key,
    required this.starred,
    this.onTap,
    this.size = 16,
  });

  @override
  Widget build(BuildContext context) {
    final p = context.ink;
    return SpiderTapIcon(
      SpiderIcons.star,
      size: size,
      hitSize: 38,
      color: starred ? p.gold : p.inkFaint,
      tooltip: starred ? 'Starred' : 'Star',
      onTap: onTap,
    );
  }
}

/// ── The cluster spine ──────────────────────────────────────────────────────
///
/// A vertical rule in the cluster's own colour, running down the left of every
/// task that belongs to it. This is what answers "which cluster is this task
/// in?" — the header alone cannot, once you have scrolled past it or once two
/// clusters share a name.
///
/// It is the one place a cluster's colour does real work rather than decorating
/// a dot, which is why the dot in the header and this rule are the same hue.
class ClusterSpine extends StatelessWidget {
  final Color color;
  final Widget child;

  /// Dimmed while the cluster is complete or empty, so a finished group
  /// recedes instead of shouting in colour.
  final bool muted;

  const ClusterSpine({
    super.key,
    required this.color,
    required this.child,
    this.muted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: Space.md),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: Strokes.spine,
              margin: const EdgeInsets.symmetric(vertical: Space.xxs),
              decoration: BoxDecoration(
                color: color.withValues(alpha: muted ? 0.22 : 0.55),
                borderRadius: Radii.brPill,
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(left: Space.lg),
                child: child,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A count, always in the mono face so it never shifts width as it ticks.
class CountBadge extends StatelessWidget {
  final String value;
  final bool emphasised;

  const CountBadge(this.value, {super.key, this.emphasised = false});

  @override
  Widget build(BuildContext context) {
    final p = context.ink;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
      constraints: const BoxConstraints(minWidth: 18),
      decoration: BoxDecoration(
        color: emphasised ? p.ink : p.surfaceAlt,
        borderRadius: Radii.brXs,
        border: Border.all(color: emphasised ? p.ink : p.line, width: 1),
      ),
      child: Text(
        value,
        textAlign: TextAlign.center,
        style: AppType.numeric(emphasised ? p.onInk : p.inkMuted),
      ),
    );
  }
}

/// Cluster completion, as a ring. Reads at 12dp where a bar would not.
class ProgressRing extends StatelessWidget {
  final double value; // 0..1
  final double size;
  final Color? color;

  const ProgressRing({
    super.key,
    required this.value,
    this.size = 12,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final p = context.ink;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RingPainter(
          value: value.clamp(0.0, 1.0),
          track: p.lineStrong,
          fill: color ?? p.ink,
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double value;
  final Color track;
  final Color fill;

  const _RingPainter({
    required this.value,
    required this.track,
    required this.fill,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final r = size.shortestSide / 2 - 0.9;
    final c = Offset(size.width / 2, size.height / 2);
    canvas.drawCircle(
      c,
      r,
      Paint()
        ..color = track
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8
        ..isAntiAlias = true,
    );
    if (value <= 0) return;
    canvas.drawArc(
      Rect.fromCircle(center: c, radius: r),
      -math.pi / 2,
      2 * math.pi * value,
      false,
      Paint()
        ..color = fill
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8
        ..strokeCap = StrokeCap.round
        ..isAntiAlias = true,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter o) =>
      o.value != value || o.track != track || o.fill != fill;
}

/// A filter pill. Selection is carried by fill, not by colour.
class SpiderPill extends StatelessWidget {
  final String label;
  final String? count;
  final bool selected;
  final Color? dotColor;
  final VoidCallback onTap;

  const SpiderPill({
    super.key,
    required this.label,
    required this.onTap,
    this.count,
    this.selected = false,
    this.dotColor,
  });

  @override
  Widget build(BuildContext context) {
    final p = context.ink;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        borderRadius: Radii.brSm,
        child: AnimatedContainer(
          duration: Motion.fast,
          curve: Motion.curve,
          height: 32,
          padding: const EdgeInsets.symmetric(horizontal: Space.lg),
          decoration: BoxDecoration(
            color: selected ? p.ink : Colors.transparent,
            borderRadius: Radii.brSm,
            border: Border.all(
              color: selected ? p.ink : p.line,
              width: Strokes.border,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (dotColor != null) ...[
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: Space.md),
              ],
              Text(
                label,
                style: AppType.labelSm(selected ? p.onInk : p.inkMuted),
              ),
              if (count != null) ...[
                const SizedBox(width: Space.sm),
                Text(
                  count!,
                  style: AppType.numeric(
                    selected ? p.onInk.withValues(alpha: 0.7) : p.inkFaint,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// A hairline. Exists so no screen invents its own divider colour.
class Rule extends StatelessWidget {
  final double indent;
  const Rule({super.key, this.indent = 0});

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(left: indent),
    child: Container(height: Strokes.hair, color: context.ink.line),
  );
}

/// A section kicker — small, wide-tracked, uppercase.
class Eyebrow extends StatelessWidget {
  final String text;
  const Eyebrow(this.text, {super.key});

  @override
  Widget build(BuildContext context) =>
      Text(text.toUpperCase(), style: AppType.eyebrow(context.ink.inkFaint));
}

/// The empty state. One serif line and one quiet line of guidance — an
/// illustration here would be decoration standing in for content.
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    final p = context.ink;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: Space.x4,
          vertical: Space.x5,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(icon, size: 28, color: p.inkFaint),
            const SizedBox(height: Space.xl),
            Text(
              title,
              textAlign: TextAlign.center,
              style: AppType.heading(p.ink),
            ),
            if (message != null) ...[
              const SizedBox(height: Space.md),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: AppType.body(p.inkMuted),
              ),
            ],
            if (action != null) ...[const SizedBox(height: Space.xxl), action!],
          ],
        ),
      ),
    );
  }
}

/// A surface that holds content — one border, one radius, no shadow.
class SpiderCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final bool highlighted;

  const SpiderCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(Space.xl),
    this.onTap,
    this.highlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    final p = context.ink;
    final body = AnimatedContainer(
      duration: Motion.fast,
      curve: Motion.curve,
      padding: padding,
      decoration: BoxDecoration(
        color: highlighted ? p.surfaceAlt : p.surface,
        borderRadius: Radii.brLg,
        border: Border.all(
          color: highlighted ? p.lineStrong : p.line,
          width: Strokes.border,
        ),
      ),
      child: child,
    );
    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      child: InkWell(onTap: onTap, borderRadius: Radii.brLg, child: body),
    );
  }
}
