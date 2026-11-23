/**
 * Kiểm thử phân quyền đầu-cuối trên database thật: dựng API trong tiến trình,
 * tạo 4 tài khoản (Chủ gia phả, Thành viên, Người ngoài họ, Chủ họ khác),
 * rồi gọi thẳng API như một người cố ý đổi ID để đọc/sửa dữ liệu không thuộc
 * quyền mình. Mỗi lời gọi phải bị từ chối (403/404), không chỉ ẩn nút ở web.
 *
 * Chạy: DATABASE_URL=postgresql://... npm run test:e2e
 * (database phải đã có schema; CI dựng Postgres riêng cho bước này).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'crypto';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';

let app: INestApplication;
let base = '';
const run = randomBytes(4).toString('hex');

type Res = { status: number; body: any };
async function call(token: string | null, method: string, path: string, body?: unknown): Promise<Res> {
  const r = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* không phải JSON */
  }
  return { status: r.status, body: json };
}

async function dangKy(ten: string): Promise<string> {
  const r = await call(null, 'POST', '/auth/email/register', {
    email: `${ten}-${run}@vidu.test`,
    password: 'matkhau-dai-123',
    displayName: ten,
  });
  assert.equal(r.status, 200, `đăng ký ${ten}: ${JSON.stringify(r.body)}`);
  const token = r.body?.data?.accessToken ?? r.body?.data?.tokens?.accessToken;
  assert.ok(token, `không thấy accessToken: ${JSON.stringify(r.body)}`);
  return token;
}

const tok: Record<'chu' | 'tv' | 'ngoai' | 'chuKhac', string> = {} as never;
let hoA = '';
let hoB = '';
let ong = '';
let cha = '';
let con = '';
let nguoiHoB = '';
let tvUserId = '';

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', 'localhost') + '/api/v1';

  tok.chu = await dangKy('chu');
  tok.tv = await dangKy('thanhvien');
  tok.ngoai = await dangKy('ngoai');
  tok.chuKhac = await dangKy('chukhac');

  const a = await call(tok.chu, 'POST', '/lineages', { name: `Họ A ${run}` });
  assert.ok(a.status < 300, JSON.stringify(a.body));
  hoA = a.body.data.id ?? a.body.data.lineage?.id;
  const b = await call(tok.chuKhac, 'POST', '/lineages', { name: `Họ B ${run}` });
  hoB = b.body.data.id ?? b.body.data.lineage?.id;

  const them = async (t: string, ho: string, ten: string) => {
    const r = await call(t, 'POST', `/genealogy/lineages/${ho}/persons`, { fullName: ten });
    assert.ok(r.status < 300, `thêm ${ten}: ${JSON.stringify(r.body)}`);
    return (r.body.data.person ?? r.body.data).id as string;
  };
  ong = await them(tok.chu, hoA, 'Nguyễn Văn Ông');
  cha = await them(tok.chu, hoA, 'Nguyễn Văn Cha');
  con = await them(tok.chu, hoA, 'Nguyễn Văn Con');
  nguoiHoB = await them(tok.chuKhac, hoB, 'Trần Văn B');

  const inv = await call(tok.chu, 'POST', `/lineages/${hoA}/invites`, {});
  assert.ok(inv.status < 300, JSON.stringify(inv.body));
  const code = inv.body.data.code ?? inv.body.data.invite?.code;
  const j = await call(tok.tv, 'POST', '/lineages/join-by-code', { code });
  assert.ok(j.status < 300, `vào họ bằng mã: ${JSON.stringify(j.body)}`);
  const me = await call(tok.tv, 'GET', '/auth/me');
  tvUserId = me.body.data.id ?? me.body.data.user?.id;
});

after(async () => {
  await app?.close();
});

const bichan = (r: Res, viec: string) =>
  assert.ok([403, 404].includes(r.status), `${viec}: lẽ ra bị chặn, nhận ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);

test('người ngoài họ không đọc được gì của họ A', async () => {
  const t = tok.ngoai;
  bichan(await call(t, 'GET', `/lineages/${hoA}`), 'xem thông tin họ');
  bichan(await call(t, 'GET', `/lineages/${hoA}/members`), 'xem thành viên');
  bichan(await call(t, 'GET', `/genealogy/lineages/${hoA}/tree`), 'xem cây');
  bichan(await call(t, 'GET', `/genealogy/lineages/${hoA}/persons`), 'xem danh sách người');
  bichan(await call(t, 'GET', `/genealogy/persons/${ong}`), 'xem hồ sơ theo ID');
  bichan(await call(t, 'GET', `/genealogy/persons/${ong}/history`), 'xem lịch sử hồ sơ');
  bichan(await call(t, 'GET', `/genealogy/lineages/${hoA}/export`), 'xuất gia phả');
  bichan(await call(t, 'GET', `/genealogy/lineages/${hoA}/backup`), 'tải bản sao lưu');
  bichan(await call(t, 'GET', `/genealogy/lineages/${hoA}/anniversaries`), 'xem ngày giỗ');
  bichan(await call(t, 'GET', `/genealogy/lineages/${hoA}/proposals`), 'xem đề xuất');
  bichan(await call(t, 'GET', `/lineages/${hoA}/posts`), 'xem bảng tin');
  bichan(await call(t, 'GET', `/lineages/${hoA}/events`), 'xem sự kiện');
  bichan(await call(t, 'POST', `/chat/lineages/${hoA}/group`), 'vào nhóm chat họ');
});

test('người ngoài họ không sửa được gì của họ A', async () => {
  const t = tok.ngoai;
  bichan(await call(t, 'PATCH', `/genealogy/persons/${ong}`, { nickname: 'x' }), 'sửa hồ sơ');
  bichan(await call(t, 'DELETE', `/genealogy/persons/${ong}`), 'xóa hồ sơ');
  bichan(await call(t, 'POST', `/genealogy/lineages/${hoA}/persons`, { fullName: 'Kẻ lạ' }), 'thêm người');
  bichan(await call(t, 'POST', `/genealogy/lineages/${hoA}/proposals`, { requestType: 'update_person', personId: ong, payload: { after: { nickname: 'x' } } }), 'gửi đề xuất');
  bichan(await call(t, 'POST', `/lineages/${hoA}/invites`, {}), 'tạo mã mời');
  bichan(await call(t, 'PATCH', `/lineages/${hoA}/members/${tvUserId}/role`, { role: 'ADMIN' }), 'đổi vai trò');
});

test('chủ họ B không dùng ID họ A để đọc/sửa (đổi ID trong API)', async () => {
  const t = tok.chuKhac;
  bichan(await call(t, 'GET', `/genealogy/persons/${ong}`), 'đọc hồ sơ họ A');
  bichan(await call(t, 'PATCH', `/genealogy/persons/${ong}`, { nickname: 'x' }), 'sửa hồ sơ họ A');
  bichan(
    await call(t, 'POST', `/genealogy/lineages/${hoB}/relationships`, { personId: nguoiHoB, relatedPersonId: ong, relationshipType: 'parent' }),
    'nối người họ B với người họ A',
  );
});

test('thành viên thường không làm được việc của người giữ gia phả hay ban quản trị', async () => {
  const t = tok.tv;
  assert.equal((await call(t, 'GET', `/genealogy/lineages/${hoA}/tree`)).status, 200, 'thành viên phải xem được cây');
  bichan(await call(t, 'DELETE', `/genealogy/persons/${ong}`), 'xóa hồ sơ');
  bichan(await call(t, 'POST', `/lineages/${hoA}/invites`, {}), 'tạo mã mời');
  bichan(await call(t, 'PATCH', `/lineages/${hoA}/members/${tvUserId}/role`, { role: 'ADMIN' }), 'tự nâng quyền');
  bichan(await call(t, 'GET', `/genealogy/lineages/${hoA}/export`), 'xuất gia phả');
  bichan(await call(t, 'DELETE', `/lineages/${hoA}`), 'xóa dòng họ');
  // Sửa trực tiếp không được áp dụng: chỉ thành đề xuất chờ duyệt.
  const sua = await call(t, 'PATCH', `/genealogy/persons/${ong}`, { nickname: 'Cụ Tổ' });
  if (sua.status < 300) {
    const p = await call(tok.chu, 'GET', `/genealogy/persons/${ong}`);
    assert.notEqual((p.body.data.person ?? p.body.data).nickname, 'Cụ Tổ', 'thành viên sửa thẳng được hồ sơ');
  }
});

test('không thể khai một người là tổ tiên của chính mình', async () => {
  const t = tok.chu;
  const rel = (personId: string, relatedPersonId: string) =>
    call(t, 'POST', `/genealogy/lineages/${hoA}/relationships`, { personId, relatedPersonId, relationshipType: 'parent' });
  assert.ok((await rel(ong, cha)).status < 300, 'ông là cha của cha');
  assert.ok((await rel(cha, con)).status < 300, 'cha là cha của con');
  const vong = await rel(con, ong);
  assert.equal(vong.status, 400, JSON.stringify(vong.body));
  assert.equal(vong.body.error?.code ?? vong.body.code, 'RELATIONSHIP_CYCLE');
  const vong2 = await call(t, 'POST', `/genealogy/lineages/${hoA}/relationships`, {
    personId: ong,
    relatedPersonId: con,
    relationshipType: 'child',
  });
  assert.equal(vong2.status, 400, 'khai ông là con của cháu');
});
