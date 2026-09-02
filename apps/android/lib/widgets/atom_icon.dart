import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/app_theme.dart';

/// Exact 1:1 vector reproduction of the Lucide `Atom` icon used in the web app.
class AtomIcon extends StatelessWidget {
  final double size;
  final Color color;
  final double strokeWidth;

  const AtomIcon({
    super.key,
    this.size = 18.0,
    this.color = AppColors.ink,
    this.strokeWidth = 1.8,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _AtomPainter(color: color, strokeWidth: strokeWidth),
      ),
    );
  }
}

class _AtomPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;

  _AtomPainter({required this.color, required this.strokeWidth});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    // 1. Center Nucleus Dot
    canvas.drawCircle(center, size.width * 0.10, fillPaint);

    final rx = size.width * 0.42;
    final ry = size.height * 0.19;

    // 2. Diagonal Orbital Ring 1 (-45 deg)
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(-math.pi / 4);
    canvas.drawOval(
      Rect.fromCenter(center: Offset.zero, width: rx * 2, height: ry * 2),
      strokePaint,
    );
    canvas.restore();

    // 3. Diagonal Orbital Ring 2 (+45 deg)
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(math.pi / 4);
    canvas.drawOval(
      Rect.fromCenter(center: Offset.zero, width: rx * 2, height: ry * 2),
      strokePaint,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _AtomPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.strokeWidth != strokeWidth;
  }
}
