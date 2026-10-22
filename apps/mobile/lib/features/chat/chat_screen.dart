import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Dữ liệu mẫu cho một cuộc trò chuyện.
class _SampleChat {
  final String initial;
  final String name;
  final String snippet;
  final bool online;

  const _SampleChat(this.initial, this.name, this.snippet, this.online);
}

/// Tab Tin nhắn: danh sách cuộc trò chuyện mẫu
/// (phòng chat dòng họ, nhóm gia đình, tin nhắn riêng).
class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    const chats = [
      _SampleChat('H', 'Phòng chat dòng họ',
          'Lan: Chi 2 đã chuẩn bị xong ạ', true),
      _SampleChat('P', 'Gia đình nhà Phụng',
          'Mẹ: Cuối tuần về quê giỗ cụ nhé', false),
      _SampleChat('H', 'Nguyễn Văn Hùng', 'Trưởng chi · Đang hoạt động', true),
      _SampleChat('L', 'Nguyễn Thị Lan', 'Chi 2 · 5 phút trước', false),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tin nhắn'),
        backgroundColor: p.bg,
        foregroundColor: p.text,
        elevation: 0,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: chats.length,
        separatorBuilder: (_, __) =>
            Divider(color: p.border, height: 1, indent: 72),
        itemBuilder: (context, i) {
          final c = chats[i];
          return ListTile(
            leading: Stack(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: p.elevated,
                  child: Text(
                    c.initial,
                    style: TextStyle(
                      color: p.text,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (c.online)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: p.brand,
                        shape: BoxShape.circle,
                        border: BorderSide(color: p.bg, width: 2),
                      ),
                    ),
                  ),
              ],
            ),
            title: Text(
              c.name,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            subtitle: Text(
              c.snippet,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: p.secondary, fontSize: 13),
            ),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Mở trò chuyện: ${c.name}')),
              );
            },
          );
        },
      ),
    );
  }
}
