import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ho_nha_toi/core/api_client.dart';
import 'package:ho_nha_toi/theme/app_theme.dart';

/// Pattern hiển thị trạng thái dùng chung cho các màn hình gọi API:
/// loading → spinner, error → message tiếng Việt + nút thử lại,
/// data → widget con.
///
/// Ví dụ:
/// ```dart
/// AsyncView<List<Map<String, dynamic>>>(
///   value: ref.watch(myLineagesProvider),
///   onRetry: () => ref.invalidate(myLineagesProvider),
///   builder: (lineages) => ListView(...),
/// )
/// ```
class AsyncView<T> extends StatelessWidget {
  const AsyncView({
    super.key,
    required this.value,
    required this.builder,
    this.onRetry,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) builder;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return value.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cloud_off_outlined, size: 40, color: p.secondary),
              const SizedBox(height: 12),
              Text(
                e is ApiException
                    ? e.message
                    : 'Đã có lỗi xảy ra. Vui lòng thử lại.',
                textAlign: TextAlign.center,
                style: TextStyle(color: p.secondary, fontSize: 14),
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: onRetry,
                  child: const Text('Thử lại'),
                ),
              ],
            ],
          ),
        ),
      ),
      data: builder,
    );
  }
}
