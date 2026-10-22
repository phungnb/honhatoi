# Họ Nhà Tôi — Mobile App (Flutter)

Khung ứng dụng Flutter cho dự án **HỌ NHÀ TÔI**: app gia phả số và cộng đồng
dòng họ, chạy trên Android và iOS.

## Yêu cầu môi trường

- Flutter 3.x (kênh stable mới nhất)
- Dart SDK >= 3.0.0 (đi kèm Flutter)
- Android Studio / Xcode nếu muốn chạy máy ảo hoặc thiết bị thật

Cài Flutter theo hướng dẫn chính thức: https://docs.flutter.dev/get-started/install

## Chạy app

```bash
cd apps/mobile
flutter pub get
flutter run
```

Chạy trên thiết bị cụ thể:

```bash
flutter devices        # xem danh sách thiết bị
flutter run -d <id>    # ví dụ: flutter run -d emulator-5554
```

## Cấu trúc thư mục

```
apps/mobile/
├── pubspec.yaml                 # Tên app ho_nha_toi, dependencies
├── README.md
└── lib/
    ├── main.dart                # Điểm khởi động, ProviderScope, MaterialApp
    ├── core/
    │   └── config.dart          # Hằng số: API base URL, tên app, timeout
    ├── theme/
    │   ├── app_theme.dart       # Design tokens "Modern Family Tech v1",
    │   │                        # AppPalette + ThemeData sáng/tối
    │   └── theme_mode_provider.dart  # StateNotifier lưu chế độ Sáng/Tối
    │                             # bằng shared_preferences
    ├── router/
    │   └── app_shell.dart       # BottomNavigationBar 5 tab tiếng Việt
    └── features/
        ├── home/home_screen.dart           # Trang chủ
        ├── genealogy/genealogy_screen.dart # Gia phả (CustomPaint mẫu)
        ├── chat/chat_screen.dart           # Tin nhắn
        ├── clan/clan_screen.dart           # Dòng họ (lịch table_calendar)
        └── profile/profile_screen.dart     # Cá nhân (công tắc Sáng/Tối)
```

## Ghi chú kỹ thuật

- **Font chữ**: dùng package `google_fonts` để tải Be Vietnam Pro
  (chữ thường) và Roboto Mono (chữ số thống kê). Lần chạy đầu tiên cần
  mạng để tải font; các lần sau dùng bản cache.
- **API backend**: đổi base URL trong `lib/core/config.dart`.
  Mặc định `http://10.0.2.2:3000` dành cho Android emulator
  (10.0.2.2 trỏ về localhost của máy host). Chạy thiết bị thật thì đổi
  thành IP LAN của máy chạy backend, ví dụ `http://192.168.1.10:3000`.
- **Bảo mật**: `flutter_secure_storage` dùng để lưu token đăng nhập
  (Keychain trên iOS, Keystore trên Android). Chưa đấu nối ở khung này.
- **Tương thích**: code tránh các API đổi tên giữa các bản Flutter 3.x
  (ví dụ không dùng `CardTheme` trong ThemeData); thẻ card dùng
  `AppTheme.cardDecoration()` để bo góc 16px nhất quán.
- Dữ liệu trong các màn hình hiện là **dữ liệu mẫu**; các phase tiếp theo
  sẽ thay bằng gọi API qua `dio` theo tài liệu kỹ thuật của dự án.
