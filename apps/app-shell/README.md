# Họ Nhà Tôi — App Android/iOS (vỏ Capacitor)

App trên điện thoại là một vỏ native mở thẳng web app
(`https://honhatoi-web-admin.vercel.app/app`), cùng cách làm với RaceHub.

- **Cập nhật giao diện, tính năng:** chỉ cần deploy web (`apps/web-admin`). Người
  dùng mở app là thấy bản mới, không phải nộp lại cửa hàng.
- **Phải nộp lại app** khi đổi phần native: plugin, quyền, icon, tên app.
- Mất mạng lúc mở app → hiện `www/offline.html`.
- Web biết đang chạy trong app nhờ user agent có `HoNhaToiApp`
  (`apps/web-admin/lib/native.ts`). Trong app ẩn nút Google vì Google chặn
  đăng nhập trong WebView; vẫn đăng nhập bằng số điện thoại hoặc email.

## Dựng thử

- **Android:** GitHub Actions → "App di động" tự chạy khi đổi thư mục này; tải
  `honhatoi-android-debug` ở mục Artifacts rồi cài thẳng file APK.
- **Máy cá nhân:** `npm ci && npx cap sync` rồi `npx cap open android` (Android
  Studio) hoặc `npx cap open ios` (Xcode, cần máy Mac).
- Đổi địa chỉ web: biến môi trường `CAP_SERVER_URL` khi chạy `cap sync`.

## Icon, màn hình chờ

Ảnh gốc ở `assets/`. Sinh lại cho Android/iOS:

```
npx @capacitor/assets generate --iconBackgroundColor '#0b0f14' --splashBackgroundColor '#0b0f14'
```

Sau đó xóa `www/manifest.json` mà lệnh sinh thêm (web app đã có manifest riêng).

## Nộp cửa hàng (chưa làm)

- Mã app `vn.honhatoi.app` — không đổi được sau lần nộp đầu.
- Google Play: tài khoản nhà phát triển, khóa ký bản phát hành, chính sách quyền riêng tư.
- App Store: tài khoản Apple Developer, Xcode trên Mac. Apple có thể từ chối app
  chỉ bọc web; cần có giá trị riêng của app (ví dụ thông báo đẩy) — làm ở đợt sau.
