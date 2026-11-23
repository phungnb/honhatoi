-- Làm giàu dòng họ mẫu (23/11/2026), theo góp ý đóng vai người dùng:
-- tên giữ chỗ ("Tổ", "Cả", "Hai", "Ba") đổi thành tên thật, có tiểu sử ngắn,
-- con dâu không gắn nhãn chi (nhãn chi theo huyết thống nhà chồng).
-- Idempotent: mỗi UPDATE chỉ chạy khi dữ liệu còn đúng bản cũ, nên chạy lại
-- không đổi gì và không ghi đè chỗ đã sửa tay.
UPDATE family_persons SET full_name = 'Nguyễn Văn Thành'
  WHERE id = '00000000-0000-4000-8000-0000000d3001' AND full_name = 'Nguyễn Văn Tổ';
UPDATE family_persons SET full_name = 'Nguyễn Văn Đức', nickname = 'Ông Cả'
  WHERE id = '00000000-0000-4000-8000-0000000d3003' AND full_name = 'Nguyễn Văn Cả';
UPDATE family_persons SET full_name = 'Nguyễn Văn Hiếu', nickname = 'Ông Hai'
  WHERE id = '00000000-0000-4000-8000-0000000d3004' AND full_name = 'Nguyễn Văn Hai';
UPDATE family_persons SET full_name = 'Nguyễn Thị Thục', nickname = 'Bà Ba'
  WHERE id = '00000000-0000-4000-8000-0000000d3005' AND full_name = 'Nguyễn Thị Ba';

-- Con dâu: bỏ nhãn chi.
UPDATE family_persons SET branch = NULL
  WHERE lineage_id = '00000000-0000-4000-8000-00000000d3e0'
    AND id IN ('00000000-0000-4000-8000-0000000d3006', '00000000-0000-4000-8000-0000000d3007',
               '00000000-0000-4000-8000-0000000d3012', '00000000-0000-4000-8000-0000000d3013',
               '00000000-0000-4000-8000-0000000d3019', '00000000-0000-4000-8000-0000000d3020')
    AND branch IS NOT NULL;

-- Tiểu sử ngắn (chỉ điền khi còn trống). Nhân vật hư cấu, dùng để minh họa.
UPDATE family_persons AS p SET bio = v.bio
FROM (VALUES
  ('00000000-0000-4000-8000-0000000d3001', 'Người khai cơ lập nghiệp tại Thanh Chương, dựng nhà thờ họ năm 1920. Làm nghề bốc thuốc nam, cả vùng gọi là ông Lang Thành. Dặn con cháu: "Giữ đất, giữ chữ, giữ hòa khí."'),
  ('00000000-0000-4000-8000-0000000d3002', 'Người làng Thanh Ngọc, về làm dâu năm 1903. Dệt vải, nuôi tằm, một mình nuôi ba con ăn học những năm cụ ông đi bốc thuốc xa.'),
  ('00000000-0000-4000-8000-0000000d3003', 'Con trưởng, giữ hương hỏa nhà thờ họ. Năm 1945 đứng ra lập lớp bình dân học vụ trong xóm. Trưởng chi trưởng từ năm 1950.'),
  ('00000000-0000-4000-8000-0000000d3004', 'Con thứ, ra lập nghiệp ở bãi sông Lam, mở lò rèn. Lập chi thứ năm 1935. Nổi tiếng hiếu thuận, ngày giỗ cha chưa năm nào vắng.'),
  ('00000000-0000-4000-8000-0000000d3005', 'Con gái út, lấy chồng họ Trần ở Đô Lương. Hằng năm về giỗ tổ, mang theo bánh chưng gói lá dong rừng.'),
  ('00000000-0000-4000-8000-0000000d3006', 'Con gái nhà nho xã bên, giỏi chữ Hán, dạy các cháu đọc gia phả cũ.'),
  ('00000000-0000-4000-8000-0000000d3007', 'Buôn bán ở chợ Rộ, tần tảo nuôi chồng con. Ngày giỗ của bà nhằm 12 tháng 11 âm lịch.'),
  ('00000000-0000-4000-8000-0000000d3008', 'Giáo viên văn trường cấp 2 Thanh Chương gần 30 năm. Chép lại cuốn gia phả chữ Hán sang chữ Quốc ngữ năm 1985.'),
  ('00000000-0000-4000-8000-0000000d3009', 'Hợp tác xã viên, sau làm hội trưởng hội phụ nữ xã. Lấy chồng trong huyện.'),
  ('00000000-0000-4000-8000-0000000d3010', 'Thợ mộc giỏi, đóng lại toàn bộ hoành phi câu đối nhà thờ họ năm 1992.'),
  ('00000000-0000-4000-8000-0000000d3011', 'Bộ đội thời chống Mỹ, sau về hưu ở Vinh. Hiện là người cao tuổi nhất họ, hay kể chuyện các cụ cho con cháu nghe.'),
  ('00000000-0000-4000-8000-0000000d3012', 'Y sĩ trạm xá xã, đỡ đẻ cho nửa số trẻ trong xóm những năm 1960–1980.'),
  ('00000000-0000-4000-8000-0000000d3013', 'Làm ruộng và nuôi dạy bốn con. Nấu cỗ giỗ ngon có tiếng trong họ.'),
  ('00000000-0000-4000-8000-0000000d3014', 'Kỹ sư cơ khí, sống ở Hà Nội. Trưởng tộc từ năm 2018, đứng ra số hóa gia phả lên Họ Nhà Tôi.'),
  ('00000000-0000-4000-8000-0000000d3015', 'Giáo viên tiểu học ở Vinh, giữ danh sách ngày giỗ và nhắc cả họ trước mỗi kỳ giỗ.'),
  ('00000000-0000-4000-8000-0000000d3016', 'Bác sĩ nội khoa ở TP. Hồ Chí Minh, mỗi năm đưa cả nhà về quê dự giỗ tổ.'),
  ('00000000-0000-4000-8000-0000000d3017', 'Ở lại quê làm vườn, trông nom nhà thờ họ và mộ phần các cụ.'),
  ('00000000-0000-4000-8000-0000000d3018', 'Kế toán ở Thanh Chương. Lấy chồng trong xã.'),
  ('00000000-0000-4000-8000-0000000d3019', 'Dược sĩ ở Hà Nội, quê Nam Định.'),
  ('00000000-0000-4000-8000-0000000d3020', 'Giáo viên mầm non ở TP. Hồ Chí Minh, quê Quảng Nam.'),
  ('00000000-0000-4000-8000-0000000d3021', 'Đích tôn đời thứ năm, lập trình viên ở Hà Nội. Lo phần kỹ thuật khi đưa gia phả lên mạng.'),
  ('00000000-0000-4000-8000-0000000d3022', 'Sinh viên năm cuối ngành kiến trúc, vẽ lại sơ đồ nhà thờ họ.'),
  ('00000000-0000-4000-8000-0000000d3023', 'Kỹ sư điện ở TP. Hồ Chí Minh.'),
  ('00000000-0000-4000-8000-0000000d3024', 'Học sinh lớp 12, phụ trách đăng ảnh các buổi giỗ lên bảng tin họ.')
) AS v(id, bio)
WHERE p.id = v.id::uuid AND (p.bio IS NULL OR p.bio = '' OR p.bio = 'Người khai cơ lập nghiệp tại Thanh Chương, dựng nhà thờ họ năm 1920.');
