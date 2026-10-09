/* ================= Trinh sát · Nhận xét AI =================
 * Dán file này vào cùng dự án Apps Script "KPI55 API" (Tệp → + → Tập lệnh, đặt tên TrinhSat_AI).
 *
 * 1) Cài khóa API: Cài đặt dự án (bánh răng) → Thuộc tính tập lệnh → Thêm:
 *      ANTHROPIC_API_KEY = sk-ant-...      (bắt buộc, lấy tại console.anthropic.com)
 *      AI_MODEL          = claude-haiku-5-5 (tùy chọn; đổi sang claude-sonnet-5-5 nếu muốn viết sâu hơn)
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
  'Bạn là chuyên viên phân tích kinh doanh của F88 (cầm đồ / cho vay), viết cho quản lý Khu vực 5.5.',
  'Bạn nhận JSON gồm: phạm vi, ngày số liệu, số ngày còn lại trong tháng, 6 KPI chính (DPD0, NET, GN NET, KHM, TLT, RFW) và danh sách tín hiệu cảnh báo / cơ hội đã được tính sẵn.',
  'Viết tiếng Việt, ngắn gọn, đọc được trên điện thoại, theo đúng 4 mục:',
  '## Tình hình chung — 2-3 câu.',
  '## 3 cảnh báo ưu tiên — gạch đầu dòng, mỗi dòng nêu PGD, con số và lý do cần xử lý trước.',
  '## 3 cơ hội nên làm ngay — gạch đầu dòng, mỗi dòng nêu việc cụ thể và lợi ích.',
  '## Việc cần làm hôm nay — tối đa 4 việc, có người/PGD phụ trách nếu suy ra được.',
  'Chỉ dùng con số có trong dữ liệu, không bịa số, không suy đoán nguyên nhân không có căn cứ. Nếu dữ liệu ít, nói rõ.'
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
      model: props.getProperty('AI_MODEL') || 'claude-haiku-5-5',
      max_tokens: 1200,
      system: AI_SYSTEM_,
      messages: [{ role: 'user', content: 'Dữ liệu (JSON):\n' + data }]
    })
  });

  const code = res.getResponseCode();
  let j = {};
  try { j = JSON.parse(res.getContentText() || '{}'); } catch (e) {}
  if (code !== 200) return { ok: false, error: 'AI trả lỗi ' + code + ((j.error && j.error.message) ? ': ' + j.error.message : '') };

  const text = (j.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('\n').trim();
  if (!text) return { ok: false, error: 'AI không trả nội dung.' };
  cache.put('ai:' + hash, text, AI_CACHE_SECONDS);
  cache.put(dayKey, String(used + 1), 86400);
  return { ok: true, text: text };
}
