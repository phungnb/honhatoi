import 'package:dio/dio.dart';
import 'package:ho_nha_toi/core/config.dart';
import 'package:ho_nha_toi/core/token_storage.dart';

/// Lỗi chuẩn của API backend: `{code: 'UPPER_SNAKE', message: 'tiếng Việt'}`.
///
/// Mọi lỗi mạng/lỗi server đều được chuẩn hóa thành [ApiException] để
/// UI chỉ cần hiển thị `e.message` cho người dùng.
class ApiException implements Exception {
  final String code;
  final String message;

  const ApiException({required this.code, required this.message});

  @override
  String toString() => 'ApiException($code): $message';
}

/// Client gọi API backend — singleton dùng chung toàn app.
///
/// - Tự gắn `Authorization: Bearer <accessToken>` vào mọi request.
/// - Khi gặp 401: tự gọi `/auth/refresh` để xoay vòng token rồi thử lại
///   request gốc một lần; nếu refresh thất bại thì xóa token và ném
///   `ApiException(code: 'SESSION_EXPIRED')` để app đưa về màn hình đăng nhập.
class ApiClient {
  ApiClient._() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: AppConfig.apiTimeout,
        receiveTimeout: AppConfig.apiTimeout,
        headers: {'Content-Type': 'application/json'},
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await TokenStorage.readAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (err, handler) async {
          final req = err.requestOptions;
          final isRefreshCall = req.path == '/auth/refresh';
          final alreadyRetried = req.extra['retried'] == true;

          if (err.response?.statusCode == 401 &&
              !isRefreshCall &&
              !alreadyRetried) {
            try {
              final refreshToken = await TokenStorage.readRefreshToken();
              if (refreshToken == null || refreshToken.isEmpty) {
                throw const ApiException(
                  code: 'SESSION_EXPIRED',
                  message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                );
              }
              final resp = await _dio.post(
                '/auth/refresh',
                data: {'refreshToken': refreshToken},
              );
              final data = (resp.data as Map<String, dynamic>)['data']
                  as Map<String, dynamic>;
              final newAccess = data['accessToken'] as String;
              final newRefresh = data['refreshToken'] as String;
              await TokenStorage.saveTokens(
                accessToken: newAccess,
                refreshToken: newRefresh,
              );
              req.headers['Authorization'] = 'Bearer $newAccess';
              req.extra['retried'] = true;
              final retryResp = await _dio.fetch(req);
              return handler.resolve(retryResp);
            } catch (_) {
              await TokenStorage.clear();
              return handler.reject(
                DioException(
                  requestOptions: req,
                  error: const ApiException(
                    code: 'SESSION_EXPIRED',
                    message:
                        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                  ),
                ),
              );
            }
          }
          handler.next(err);
        },
      ),
    );
  }

  static final ApiClient instance = ApiClient._();

  late final Dio _dio;

  /// Gọi API và trả về object `data` trong response.
  ///
  /// Ném [ApiException] khi backend trả lỗi hoặc khi lỗi mạng.
  Future<Map<String, dynamic>> getData(
    String method,
    String path, {
    Map<String, dynamic>? query,
    Map<String, dynamic>? body,
  }) async {
    try {
      late final Response<dynamic> response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await _dio.get(path, queryParameters: query);
          break;
        case 'POST':
          response = await _dio.post(path, data: body);
          break;
        case 'PATCH':
          response = await _dio.patch(path, data: body);
          break;
        case 'DELETE':
          response = await _dio.delete(path, data: body);
          break;
        default:
          throw ArgumentError('HTTP method không hỗ trợ: $method');
      }
      final payload = response.data;
      if (payload is Map<String, dynamic>) {
        final data = payload['data'];
        if (data is Map<String, dynamic>) return data;
      }
      return <String, dynamic>{};
    } on DioException catch (e) {
      // ApiException đã được đóng gói sẵn (ví dụ SESSION_EXPIRED).
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    }
  }

  /// Tải file nhị phân (ví dụ file Excel xuất gia phả) về dạng bytes.
  ///
  /// Dùng chung interceptor gắn token + tự refresh khi 401 như getData.
  Future<List<int>> downloadBytes(String path) async {
    try {
      final response = await _dio.get<List<int>>(
        path,
        options: Options(responseType: ResponseType.bytes),
      );
      return response.data ?? <int>[];
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    }
  }

  /// Chuẩn hóa lỗi Dio thành ApiException có message tiếng Việt.
  ApiException _mapDioError(DioException e) {
    final res = e.response?.data;
    if (res is Map<String, dynamic> && res['code'] is String) {
      return ApiException(
        code: res['code'] as String,
        message: (res['message'] as String?) ?? 'Đã có lỗi xảy ra.',
      );
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException(
          code: 'NETWORK_TIMEOUT',
          message: 'Kết nối tới máy chủ quá chậm. Vui lòng thử lại.',
        );
      default:
        return const ApiException(
          code: 'NETWORK_ERROR',
          message:
              'Không thể kết nối tới máy chủ. Kiểm tra mạng và địa chỉ backend.',
        );
    }
  }
}
