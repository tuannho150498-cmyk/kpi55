/* ================= Trinh sát · Nhận xét AI =================
 * Dán file này vào cùng dự án Apps Script "KPI55 API" (Tệp → + → Tập lệnh, đặt tên TrinhSat_AI).
 *
 * 1) Cài khóa API: Cài đặt dự án (bánh răng) → Thuộc tính tập lệnh → Thêm:
 *      ANTHROPIC_API_KEY = sk-ant-...      (bắt buộc, lấy tại console.anthropic.com)
 *      AI_MODEL          = claude-sonnet-5-5 (tùy chọn; claude-haiku-5-5 rẻ hơn nhưng phân tích nông)
 *
 * 2) Trong hàm doPost của Code.gs (Mã.gs), thêm 1 dòng cạnh case 'botlog':
 *      case 'ai':       out = aiAnalyze_(session_(req), req); break;
 *
 * 3) Triển khai → Quản lý triển khai → sửa → Phiên bản mới → Triển khai.
 *
 * Quyền: admin luôn dùng được. Người khác chỉ dùng được khi admin bật công tắc ở mục
 * "Ai được dùng Trinh sát" trên trang "Cơ hội & Cảnh báo" (danh sách tài khoản lấy từ tab Users
 * của file "KPI55 – Quản trị"; email được bật lưu ở thuộc tính TRINHSAT_EMAILS).
 *
 * AI chỉ nhận danh sách tín hiệu + 6 KPI chính mà trang đã tính sẵn cho đúng phạm vi người đó được xem,
 * không đọc file Google Sheet gốc.
 */
const AI_DAILY_LIMIT = 30;           // số lần gọi AI tối đa / người / ngày
const AI_CACHE_SECONDS = 6 * 3600;   // cùng một bộ số liệu thì dùng lại nhận xét cũ

const AI_SYSTEM_ = [
  'Bạn là trưởng phòng phân tích kinh doanh của F88 (chuỗi cầm đồ / cho vay tiêu dùng), báo cáo cho Giám đốc Khu vực 5.5 (12 phòng giao dịch - PGD, mỗi PGD có một trưởng PGD - TPGD).',
  '',
  'NGHIỆP VỤ:',
  '- DPD0: dư nợ đang trong hạn (chưa quá hạn ngày nào). Càng cao càng tốt, là quy mô sổ cho vay.',
  '- NET (tăng Net): dư nợ tăng ròng trong tháng = giải ngân trừ khách trả gốc/tất toán. NET âm = sổ đang co lại, rất nghiêm trọng.',
  '- GN NET: giải ngân thuần trong tháng. KHM: số khách hàng mới. Đây là đầu vào để tăng NET.',
  '- TLT: tỷ lệ thu nợ nhóm DPD0 đến hạn. Thấp = khách đến hạn không trả, sắp chuyển quá hạn.',
  '- RFW: tỷ lệ dư nợ chuyển từ trong hạn sang quá hạn. Là chỉ tiêu TRẦN: thực hiện càng THẤP càng tốt. Rút gốc và tỷ lệ trễ hạn cũng là chỉ tiêu trần.',
  '- pct_dat là % hoàn thành mục tiêu tháng; với chỉ tiêu trần, pct_dat đã được quy đổi nên vẫn là càng cao càng tốt. Dưới 90% là cảnh báo, 90-100% là theo dõi, từ 100% là đạt.',
  '- Kênh bán khách mới: Digital HO, Marketing PGD, CTV PGD, PTĐT. Form = lượt đăng ký; F2S = tỷ lệ Form chuyển thành khách vay. F2S giảm nghĩa là xử lý lead kém (gọi chậm, tư vấn yếu).',
  '- KPI phụ: MBBank (nạp rút, mở tài khoản MB) và bảo hiểm (bán kèm khi giải ngân). Điểm = bình quân % đạt.',
  '- Số liệu là lũy kế từ đầu tháng; con_lai_ngay là số ngày còn lại để đạt mục tiêu tháng.',
  '',
  'DỮ LIỆU NHẬN ĐƯỢC (JSON): kpi_chinh và kpi_phu của phạm vi đang xem, kenh_ban, bang_pgd (xếp hạng 12 PGD, nếu có), so_voi_khu_vuc (nếu đang xem 1 PGD) và tin_hieu (cảnh báo/cơ hội hệ thống đã tính sẵn).',
  '',
  'CÁCH VIẾT:',
  '- Như một người quản lý giỏi nói với sếp: thẳng, cụ thể, có tên PGD và con số. Cấm câu chung chung kiểu "cần nỗ lực hơn", "cần cải thiện".',
  '- Tìm MỐI LIÊN HỆ giữa các chỉ số để chỉ ra nguyên nhân gốc, ví dụ: KHM thấp vì F2S kênh nào giảm; NET âm dù GN tốt thì do rút gốc/tất toán cao; TLT thấp thì RFW tháng sau sẽ xấu.',
  '- Tính cụ thể khoảng cách: còn thiếu bao nhiêu, mỗi ngày cần thêm bao nhiêu với số ngày còn lại; PGD nào kéo tụt khu vực nhiều nhất.',
  '- Mỗi việc cần làm phải giao cho ai (PGD/TPGD hoặc kênh), làm gì, đo bằng chỉ số nào.',
  '- Chỉ dùng số có trong dữ liệu, không bịa. Thiếu dữ liệu thì nói rõ thiếu gì.',
  '',
  'ĐỊNH DẠNG (tiếng Việt, đọc trên điện thoại, tổng dưới 350 chữ):',
  '## Nhận định — 2-3 câu: tình hình chung và VẤN ĐỀ LỚN NHẤT tháng này.',
  '## 3 điểm nóng — gạch đầu dòng: PGD/chỉ tiêu, con số, nguyên nhân gốc.',
  '## 3 cơ hội — gạch đầu dòng: việc cụ thể, kết quả kỳ vọng bằng số.',
  '## Việc ngày mai — tối đa 4 việc: ai làm, làm gì, đo bằng chỉ số nào.'
].join('\n');

function trinhSatEmails_() {
  return String(PropertiesService.getScriptProperties().getProperty('TRINHSAT_EMAILS') || '')
    .split(/[,\s]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
}
function trinhSatAllowed_(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return trinhSatEmails_().indexOf(String(user.email || '').toLowerCase()) >= 0;
}

// Danh sách tài khoản trong tab Users của file Quản trị, kèm cờ đã bật Trinh sát hay chưa.
function trinhSatUsers_() {
  const ss = adminSS_();                 // hàm sẵn có trong Mã.gs: mở file KPI55 – Quản trị
  const sh = ss.getSheetByName('Users');
  if (!sh) throw new Error('File Quản trị chưa có tab Users.');
  const rows = sh.getDataRange().getValues(); if (rows.length < 2) return [];
  const key = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ''); };
  const h = rows[0].map(key), col = function (n) { return h.indexOf(n); };
  const iE = col('email'), iN = col('hoten'), iR = col('vaitro'), iP = col('mapgd'), iA = col('kichhoat');
  if (iE < 0) throw new Error('Tab Users thiếu cột Email.');
  const allowed = trinhSatEmails_();
  return rows.slice(1).map(function (r) {
    const email = String(r[iE] || '').trim().toLowerCase(); if (!email) return null;
    const act = iA < 0 ? true : (r[iA] === true || /^(true|1|x|có|co)$/i.test(String(r[iA]).trim()));
    return { email: email, name: iN < 0 ? '' : String(r[iN] || '').trim(), role: iR < 0 ? '' : String(r[iR] || '').trim().toLowerCase(),
             pgd: iP < 0 ? '' : String(r[iP] || '').trim(), active: act, allowed: allowed.indexOf(email) >= 0 };
  }).filter(Boolean);
}

function aiAnalyze_(user, body) {
  const op = (body && body.op) || 'analyze';
  const isAdmin = !!(user && user.role === 'admin');
  if (op === 'check') return { ok: true, allowed: trinhSatAllowed_(user) };
  if (op === 'users') {
    if (!isAdmin) return { ok: false, error: 'Chỉ admin được cấp quyền Trinh sát.' };
    return { ok: true, users: trinhSatUsers_() };
  }
  if (op === 'list' || op === 'set') {
    if (!isAdmin) return { ok: false, error: 'Chỉ admin được cấp quyền Trinh sát.' };
    if (op === 'set') {
      const list = ((body && body.emails) || []).map(function (s) { return String(s).trim().toLowerCase(); })
        .filter(function (s, i, a) { return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(s) && a.indexOf(s) === i; });
      PropertiesService.getScriptProperties().setProperty('TRINHSAT_EMAILS', list.join(','));
    }
    return { ok: true, emails: trinhSatEmails_() };
  }
  if (!trinhSatAllowed_(user)) return { ok: false, error: 'Tài khoản chưa được cấp quyền dùng Trinh sát.' };

  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('ANTHROPIC_API_KEY');
  if (!key) return { ok: false, error: 'Chưa cài ANTHROPIC_API_KEY trong Thuộc tính tập lệnh của Apps Script.' };

  const data = JSON.stringify((body && body.payload) || {});
  if (data.length < 20) return { ok: false, error: 'Chưa có tín hiệu để phân tích, hãy bấm Quét trước.' };
  if (data.length > 40000) return { ok: false, error: 'Dữ liệu gửi AI quá lớn.' };

  const cache = CacheService.getScriptCache();
  const hash = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, data, Utilities.Charset.UTF_8));
  const hit = cache.get('ai:' + hash);
  if (hit) return { ok: true, text: hit, cached: true };

  const email = String((user && user.email) || 'unknown').toLowerCase();
  const dayKey = 'aicnt:' + email + ':' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  const used = Number(cache.get(dayKey) || 0);
  if (used >= AI_DAILY_LIMIT) return { ok: false, error: 'Hôm nay đã dùng hết ' + AI_DAILY_LIMIT + ' lượt nhận xét AI.' };

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: props.getProperty('AI_MODEL') || 'claude-sonnet-5-5',
      max_tokens: 2000, thinking: { type: 'disabled' },
      system: AI_SYSTEM_,
      messages: [{ role: 'user', content: 'Dữ liệu (JSON):\n' + data }]
    })
  });

  const code = res.getResponseCode();
  let j = {};
  try { j = JSON.parse(res.getContentText() || '{}'); } catch (e) {}
  if (code !== 200) return { ok: false, error: 'AI trả lỗi ' + code + ((j.error && j.error.message) ? ': ' + j.error.message : '') };

  const text = (j.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('\n').trim();
  if (!text) return { ok: false, error: 'AI không trả nội dung (stop=' + j.stop_reason + ', khối=' + (j.content || []).map(function (c) { return c.type; }).join('/') + ', model=' + j.model + ').' };
  cache.put('ai:' + hash, text, AI_CACHE_SECONDS);
  cache.put(dayKey, String(used + 1), 86400);
  return { ok: true, text: text };
}

/** Chạy thử nhận xét AI trong trình soạn thảo (chọn hàm này rồi bấm Chạy, xem Nhật ký thực thi). */
function testTrinhSatAI() {
  const props = PropertiesService.getScriptProperties();
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': props.getProperty('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: props.getProperty('AI_MODEL') || 'claude-sonnet-5-5', max_tokens: 2000, thinking: { type: 'disabled' }, system: AI_SYSTEM_, messages: [{ role: 'user', content: 'Dữ liệu (JSON):\n' + JSON.stringify({ pham_vi: 'Khu vực 5.5', so_lieu_ngay: '09/10/2026', con_lai_ngay: 22, kpi_chinh: [{ kpi: 'NET', thuc_hien: '-120', muc_tieu: '900', pct_dat: '0%' }, { kpi: 'GN NET', thuc_hien: '8.200', muc_tieu: '9.000', pct_dat: '91%' }], tin_hieu: [{ loai: 'canh_bao', muc: 'Khẩn', noi_dung: 'GLI 247 Lê Duẩn: Tăng Net đang âm -120.', goi_y: 'Rà KH sắp tất toán.' }, { loai: 'co_hoi', muc: 'Nên làm', noi_dung: 'Khu vực 5.5: GN NET đạt 91%, còn thiếu 800.', goi_y: 'Dồn lực vài ngày.' }] }) }] }) });
  const j = JSON.parse(res.getContentText() || '{}');
  Logger.log('HTTP ' + res.getResponseCode() + ' | stop=' + j.stop_reason + ' | model=' + j.model + ' | khối=' + (j.content || []).map(function (c) { return c.type + ':' + String(c.text || '').slice(0, 80); }).join(' || ') + ' | lỗi=' + JSON.stringify(j.error || null) + ' | usage=' + JSON.stringify(j.usage || null));
}
