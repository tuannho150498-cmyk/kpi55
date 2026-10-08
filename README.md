# Dashboard KPI Khu vực 5.5 – bản web (GitHub Pages + đăng nhập Gmail)

```
Trình duyệt ──(đăng nhập Gmail)──> GitHub Pages (index.html, app.js, config.js)
      │                                   không chứa số liệu
      └──(mã phiên)──> Apps Script API (Code.gs, chạy bằng tài khoản của anh)
                             ├─ đọc 3 file Google Sheet (để chế độ Bị hạn chế)
                             └─ file "KPI55 – Quản trị": Users · LichSu · NhatKy
```

Số liệu chỉ đi qua Apps Script, sau khi kiểm tra email có trong danh sách Users. Tài khoản PGD chỉ nhận số của PGD mình (lọc trên máy chủ).

## Bước 1 – Apps Script (backend)
1. Vào https://script.google.com → **Dự án mới**, đặt tên `KPI55 API`.
2. Xóa code mẫu, dán toàn bộ `backend/Code.gs`.
3. Chọn hàm `setup` → **Chạy** → cấp quyền. Hàm này tạo file **KPI55 – Quản trị** trong Drive (anh tự động là admin).
4. **Triển khai → Tùy chọn triển khai mới → Ứng dụng web**
   - Thực thi dưới dạng: **Tôi**
   - Người có quyền truy cập: **Bất kỳ ai** (vẫn an toàn: không có mã phiên hợp lệ thì API không trả số liệu)
5. Copy link kết thúc bằng `/exec`.

## Bước 2 – Google OAuth Client ID
1. https://console.cloud.google.com → tạo project `KPI55`.
2. **APIs & Services → OAuth consent screen**: External, điền tên app + email → Lưu (không cần thêm scope).
   Ứng dụng đã được xuất bản (In production): mọi Gmail bấm đăng nhập được, nhưng chỉ ai có trong tab Users mới xem được số.
3. **Credentials → Create credentials → OAuth client ID** → loại **Web application**
   - Authorized JavaScript origins: `https://<tên-github>.github.io`
4. Copy Client ID (dạng `xxxx.apps.googleusercontent.com`).
5. Quay lại Apps Script: dán Client ID vào `CONFIG.CLIENT_ID` → Lưu → **Triển khai → Quản lý triển khai → sửa (bút chì) → Phiên bản mới → Triển khai** (link /exec giữ nguyên).

## Bước 3 – GitHub Pages (frontend)
1. Mở `config.js`, điền `API_URL` (link /exec) và `GOOGLE_CLIENT_ID`.
2. GitHub → **New repository**, ví dụ `kpi55` (Public được, repo không chứa số liệu).
3. **Add file → Upload files** → kéo thả `index.html`, `app.js`, `config.js`, `.nojekyll`, `README.md` (thư mục `backend` không bắt buộc) → Commit.
4. **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
5. Sau 1–2 phút: `https://<tên-github>.github.io/kpi55/`

## Bước 4 – Cấp quyền người xem
Mở file **KPI55 – Quản trị**, tab **Users**, mỗi người một dòng:

| Email | Họ tên | Vai trò | Mã PGD | Kích hoạt |
|---|---|---|---|---|
| anh@gmail.com | Hồ Phi Tuấn | admin | | TRUE |
| ql.khuvuc@gmail.com | … | khuvuc | | TRUE |
| truongpgd247@gmail.com | … | pgd | GLI21004 | TRUE |

- **admin**: xem tất cả, Chốt tháng, quản lý tab Users.
- **khuvuc**: xem toàn bộ 12 PGD, xếp hạng, kiểm tra dữ liệu.
- **pgd**: chỉ thấy PGD của mình (+ dòng tổng khu vực để so sánh; tắt bằng `PGD_SEE_REGION_TOTAL: false`).
- Mã PGD lấy theo phần đầu tên trên sheet, ví dụ `GLI21004.247 Lê Duẩn` → `GLI21004`.
- Thu hồi quyền: đặt **Kích hoạt = FALSE** (có hiệu lực ngay ở lần bấm Làm mới tiếp theo).
- Tab **NhatKy** ghi lại ai đăng nhập / tải số / chốt tháng.

## Bước 5 – Khóa 3 file Google Sheet nguồn
Ở cả 3 file: **Chia sẻ → Quyền truy cập chung → Bị hạn chế**. Apps Script vẫn đọc được vì chạy bằng tài khoản của anh.

## Cấp quyền cho người mới
Chỉ cần thêm 1 dòng vào tab **Users** của file Quản trị (Email, Họ tên, Vai trò, Mã PGD, Kích hoạt = TRUE). Không cần thêm ở Google Cloud nữa.

## Tính năng
- **Báo cáo Zalo**: nút trên thanh trên cùng, sao chép đoạn tin nhắn 6 chỉ tiêu + PGD cần đẩy, dán thẳng vào Zalo.
- **Còn thiếu**: thẻ chỉ tiêu và Hồ sơ PGD ghi rõ còn thiếu bao nhiêu để đạt MT (RFW ghi vượt trần).
- **Ghi chú hành động**: Admin và Khu vực ghi việc cần làm cho từng PGD ở Hồ sơ PGD; trưởng PGD đăng nhập là thấy. Lưu ở tab GhiChu (tự tạo).
- **Ai đã xem** (chỉ Admin): ai đã mở báo cáo hôm nay, lần mở gần nhất, hoạt động gần đây (đọc từ tab NhatKy).
- **Tải nhanh**: máy chủ giữ số liệu 5 phút; nút Làm mới luôn lấy số mới nhất từ Google Sheet.
- **Cài lên điện thoại**: mở trang bằng Chrome (Android) → ⋮ → Thêm vào màn hình chính; Safari (iPhone) → Chia sẻ → Thêm vào MH chính.

## Sử dụng
- **Làm mới**: tải lại số mới nhất từ Google Sheet.
- **Chốt tháng** (admin, cuối tháng): lưu số vào tab LichSu → cột *Xu hướng* ở Hồ sơ PGD.
- **Hồ sơ PGD** có nút copy link riêng `?pgd=GLI21004` gửi trưởng PGD (vẫn phải đăng nhập).
- Phiên đăng nhập hết hạn sau 6 giờ (`SESSION_HOURS`); đóng trình duyệt là phải đăng nhập lại.

## Khi sửa Code.gs
Luôn **Triển khai → Quản lý triển khai → Phiên bản mới**, nếu không web vẫn chạy code cũ.

## Lỗi thường gặp
| Thông báo | Cách xử lý |
|---|---|
| Chưa cấu hình config.js | Điền API_URL và GOOGLE_CLIENT_ID |
| Nút Google báo origin không hợp lệ | Thêm đúng `https://<tên>.github.io` vào Authorized JavaScript origins (không có `/kpi55`) |
| Email chưa được cấp quyền | Thêm email vào tab Users, Kích hoạt = TRUE |
| Không tải được số | Kiểm tra quyền Apps Script, triển khai lại Phiên bản mới |
