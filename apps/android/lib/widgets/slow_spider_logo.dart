import 'package:flutter/material.dart';

class SlowSpiderLogo extends StatelessWidget {
  final double size;
  final bool showText;

  const SlowSpiderLogo({super.key, this.size = 28, this.showText = false});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final strokeColor = isDark
        ? const Color(0xFFF2F3F5)
        : const Color(0xFF181920);
    final bgColor = isDark ? const Color(0xFF1E1F25) : const Color(0xFFEFF1F5);
    final borderColor = isDark
        ? const Color(0xFF2E303B)
        : const Color(0xFFD1D5DB);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          padding: EdgeInsets.all(size * 0.14),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(size * 0.32),
            border: Border.all(color: borderColor, width: 1),
          ),
          child: CustomPaint(
            painter: _SpiderLogoPainter(strokeColor: strokeColor),
          ),
        ),
        if (showText) ...[
          const SizedBox(width: 8),
          Text(
            'Slow Spider',
            style: TextStyle(
              color: strokeColor,
              fontWeight: FontWeight.w700,
              fontSize: 16,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ],
    );
  }
}

class _SpiderLogoPainter extends CustomPainter {
  final Color strokeColor;
  _SpiderLogoPainter({required this.strokeColor});

  @override
  void paint(Canvas canvas, Size size) {
    final scaleX = size.width / 143.0;
    final scaleY = size.height / 100.0;

    final strokePaint = Paint()
      ..color = strokeColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14.0 * scaleX
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path1 = Path();
    path1.moveTo(8 * scaleX, 91 * scaleY);
    path1.lineTo(54 * scaleX, 8 * scaleY);
    path1.lineTo(100 * scaleX, 91 * scaleY);
    canvas.drawPath(path1, strokePaint);

    final path2 = Path();
    path2.moveTo(43 * scaleX, 91 * scaleY);
    path2.lineTo(89 * scaleX, 8 * scaleY);
    path2.lineTo(135 * scaleX, 91 * scaleY);
    canvas.drawPath(path2, strokePaint);

    final dotPaint = Paint()
      ..color =
          const Color(0xFFFBBF24) // Amber 400
      ..style = PaintingStyle.fill;

    canvas.drawCircle(
      Offset(71.5 * scaleX, 87 * scaleY),
      11.5 * scaleX,
      dotPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _SpiderLogoPainter oldDelegate) =>
      oldDelegate.strokeColor != strokeColor;
}
