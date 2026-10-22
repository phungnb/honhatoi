import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Tab Gia phả: vẽ cây gia đình đơn giản bằng CustomPaint
/// (bản đầy đủ sẽ tải dữ liệu thật từ API và hỗ trợ kéo/phóng).
class GenealogyScreen extends StatelessWidget {
  const GenealogyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gia phả'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Container(
                decoration: AppTheme.cardDecoration(p),
                clipBehavior: Clip.antiAlias,
                child: CustomPaint(
                  painter: _TreePainter(p),
                  size: Size.infinite,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Chạm vào một nút để xem hồ sơ thành viên (bản đầy đủ).',
              textAlign: TextAlign.center,
              style: TextStyle(color: p.secondary, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

/// Vẽ 3 nút mẫu: cụ tổ ở trên, hai người con ở dưới.
class _TreePainter extends CustomPainter {
  _TreePainter(this.p);

  final AppPalette p;

  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = p.border
      ..strokeWidth = 2.0;

    final root = Offset(size.width / 2, 64);
    final left = Offset(size.width / 2 - 96, 210);
    final right = Offset(size.width / 2 + 96, 210);
    const midY = 137.0;

    // Đường nối cha - con
    canvas.drawLine(
        root + const Offset(0, 32), Offset(root.dx, midY), linePaint);
    canvas.drawLine(
        Offset(left.dx, midY), Offset(right.dx, midY), linePaint);
    canvas.drawLine(
        Offset(left.dx, midY), left - const Offset(0, 34), linePaint);
    canvas.drawLine(
        Offset(right.dx, midY), right - const Offset(0, 34), linePaint);

    _drawNode(canvas, root, 'T', 'Cụ Nguyễn Văn Tổ', p.warmAccent);
    _drawNode(canvas, left, 'B', 'Ông Nguyễn Văn Bình', p.xp);
    _drawNode(canvas, right, 'Đ', 'Ông Nguyễn Văn Đức', p.xp);
  }

  void _drawNode(
      Canvas canvas, Offset center, String initial, String label, Color ring) {
    // Vòng tròn viền màu
    canvas.drawCircle(center, 30, Paint()..color = ring);
    canvas.drawCircle(center, 26, Paint()..color = p.elevated);

    final initialPainter = TextPainter(
      text: TextSpan(
        text: initial,
        style: TextStyle(
          color: p.text,
          fontWeight: FontWeight.w800,
          fontSize: 18,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    initialPainter.paint(
      canvas,
      center +
          Offset(
              -initialPainter.width / 2, -initialPainter.height / 2),
    );

    final labelPainter = TextPainter(
      text: TextSpan(
        text: label,
        style: TextStyle(
          color: p.secondary,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    labelPainter.paint(
      canvas,
      Offset(center.dx - labelPainter.width / 2, center.dy + 38),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
