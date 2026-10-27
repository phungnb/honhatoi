/**
 * Suy luận danh xưng vai vế họ tộc (tuần 3 theo đánh giá chuyên gia
 * 27/10/2026: "Người này là Chú họ của bạn", "Cháu đích tôn của Chi
 * trưởng"...).
 *
 * Thuần túy, không phụ thuộc NestJS/Prisma — để kiểm thử logic độc lập.
 *
 * Cách làm: BFS trên đồ thị người — quan hệ trong cây (cha/mẹ, con,
 * vợ/chồng, con nuôi/cha mẹ nuôi) để tìm đường đi ngắn nhất từ `from`
 * tới `to`, rồi ánh xạ dạng đường đi sang danh xưng tiếng Việt nhìn từ
 * phía `from`.
 *
 * Quy ước chiều (khớp INVERSE trong genealogy.service.ts):
 * - bản ghi (A, B, 'parent' | 'adoptive_parent'): A là cha/mẹ của B.
 * - bản ghi (A, B, 'child' | 'adoptive_child'): A là con của B.
 * - bản ghi (A, B, 'spouse'): A là vợ/chồng của B.
 * - 'ex_spouse' KHÔNG dùng để đi đường (tránh danh xưng qua vợ/chồng cũ).
 *
 * Giới hạn có chủ ý (ghi rõ để không xưng sai cho người đã khuất):
 * - Chỉ ánh xạ chắc chắn tới 3 bước (trừ chuỗi thuần lên/xuống tới 5 đời).
 * - So sánh tuổi cần năm sinh của cả hai người; thiếu thì trả danh xưng
 *   mơ hồ kèm ghi chú, không đoán mò.
 * - Bên nội/ngoại của bác/chú/cô/cậu/dì xác định qua giới tính của cha/mẹ
 *   (nút giữa đường đi); không rõ thì trả dạng mơ hồ kèm ghi chú.
 * - Đường đi dài hơn hoặc dạng lạ → title null + mô tả đường đi, để
 *   giao diện hiển thị mối liên hệ thay vì một danh xưng sai.
 */

export interface KinshipPerson {
  id: string;
  fullName: string;
  gender?: string | null; // 'male' | 'female'
  dateOfBirth?: string | null; // ISO
}

export interface KinshipRelation {
  personId: string;
  relatedPersonId: string;
  relationshipType: string;
}

export type KinshipStep = 'up' | 'down' | 'across';

export interface KinshipPathNode {
  personId: string;
  fullName: string;
  /** Bước đi từ nút trước tới nút này; null ở nút xuất phát. */
  stepFromPrevious: KinshipStep | null;
}

export interface KinshipResult {
  /** Danh xưng của `to` nhìn từ `from`; null khi chưa xác định được. */
  title: string | null;
  /** Câu đầy đủ, VD "Nguyễn Văn B là chú của Nguyễn Văn A". */
  sentence: string | null;
  path: KinshipPathNode[];
  /** Ghi chú khi phải dùng dạng mặc định/mơ hồ, hoặc khi không có đường. */
  note: string | null;
}

function birthYear(p: KinshipPerson): number | null {
  if (!p.dateOfBirth) return null;
  const m = /^(\d{4})/.exec(p.dateOfBirth);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return Number.isNaN(y) ? null : y;
}

/** 1: a lớn tuổi hơn b, -1: a nhỏ tuổi hơn b, 0: không so được. */
function compareAge(a: KinshipPerson, b: KinshipPerson): number {
  const ya = birthYear(a);
  const yb = birthYear(b);
  if (ya === null || yb === null) return 0;
  if (ya === yb) return 0;
  return ya < yb ? 1 : -1;
}

function gendered(
  p: KinshipPerson,
  male: string,
  female: string,
  neutral: string,
): string {
  if (p.gender === 'male') return male;
  if (p.gender === 'female') return female;
  return neutral;
}

interface StepEdge {
  to: string;
  step: KinshipStep;
}

function buildGraph(relations: KinshipRelation[]): Map<string, StepEdge[]> {
  const graph = new Map<string, StepEdge[]>();
  const push = (from: string, to: string, step: KinshipStep) => {
    const list = graph.get(from) ?? [];
    if (!list.some((e) => e.to === to && e.step === step)) list.push({ to, step });
    graph.set(from, list);
  };
  for (const r of relations) {
    const { personId: x, relatedPersonId: y, relationshipType: t } = r;
    if (t === 'parent' || t === 'adoptive_parent') {
      push(x, y, 'down');
      push(y, x, 'up');
    } else if (t === 'child' || t === 'adoptive_child') {
      push(x, y, 'up');
      push(y, x, 'down');
    } else if (t === 'spouse') {
      push(x, y, 'across');
      push(y, x, 'across');
    }
    // ex_spouse: không đi đường.
  }
  return graph;
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function findKinship(
  fromId: string,
  toId: string,
  persons: KinshipPerson[],
  relations: KinshipRelation[],
): KinshipResult | null {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const from = byId.get(fromId);
  const to = byId.get(toId);
  if (!from || !to) return null;

  if (fromId === toId) {
    return {
      title: 'Chính mình',
      sentence: null,
      path: [{ personId: from.id, fullName: from.fullName, stepFromPrevious: null }],
      note: null,
    };
  }

  // BFS tìm đường ngắn nhất.
  const graph = buildGraph(relations);
  const prev = new Map<string, { id: string; step: KinshipStep }>();
  const queue: string[] = [fromId];
  const seen = new Set<string>([fromId]);
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    if (cur === toId) break;
    for (const e of graph.get(cur) ?? []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, { id: cur, step: e.step });
      queue.push(e.to);
    }
  }
  if (!seen.has(toId)) {
    return {
      title: null,
      sentence: null,
      path: [{ personId: from.id, fullName: from.fullName, stepFromPrevious: null }],
      note: 'Hai người cùng dòng họ nhưng cây gia phả hiện chưa ghi quan hệ nối hai người.',
    };
  }

  // Dựng lại đường đi: ids theo thứ tự từ from tới to,
  // edgeSteps[i] là bước đi từ ids[i] sang ids[i + 1].
  const ids: string[] = [toId];
  const edgeSteps: KinshipStep[] = [];
  let cur = toId;
  while (cur !== fromId) {
    const p = prev.get(cur) as { id: string; step: KinshipStep };
    ids.unshift(p.id);
    edgeSteps.unshift(p.step);
    cur = p.id;
  }
  const nodes: KinshipPathNode[] = ids.map((id, i) => {
    const person = byId.get(id) as KinshipPerson;
    return {
      personId: person.id,
      fullName: person.fullName,
      stepFromPrevious: i === 0 ? null : edgeSteps[i - 1],
    };
  });
  const steps = edgeSteps;

  const titleAndNote = titleForPath(steps, nodes, byId, graph, fromId);
  const sentence = titleAndNote.title
    ? `${to.fullName} là ${lowerFirst(titleAndNote.title)} của ${from.fullName}`
    : null;
  return {
    title: titleAndNote.title,
    sentence,
    path: nodes,
    note: titleAndNote.note,
  };
}

function titleForPath(
  steps: KinshipStep[],
  nodes: KinshipPathNode[],
  byId: Map<string, KinshipPerson>,
  graph: Map<string, StepEdge[]>,
  fromId: string,
): { title: string | null; note: string | null } {
  const personAt = (i: number) => byId.get(nodes[i].personId) as KinshipPerson;
  const from = personAt(0);
  const to = personAt(nodes.length - 1);
  const key = steps.join(',');

  // Chuỗi thuần lên: cha/mẹ → ông/bà → cụ → kỵ → tổ.
  if (steps.every((s) => s === 'up')) {
    const upTitles = ['', 'Cha/Mẹ', 'Ông/Bà', 'Cụ', 'Kỵ', 'Tổ'];
    if (steps.length === 1) return { title: gendered(to, 'Cha', 'Mẹ', 'Cha/Mẹ'), note: null };
    if (steps.length === 2) return { title: gendered(to, 'Ông', 'Bà', 'Ông/Bà'), note: null };
    if (steps.length === 3) return { title: gendered(to, 'Cụ ông', 'Cụ bà', 'Cụ'), note: null };
    if (steps.length === 4) return { title: gendered(to, 'Ông kỵ', 'Bà kỵ', 'Kỵ'), note: null };
    if (steps.length === 5) return { title: gendered(to, 'Ông tổ', 'Bà tổ', 'Tổ'), note: null };
    return { title: null, note: `Tổ tiên cách ${steps.length} đời — vượt phạm vi danh xưng chuẩn.` };
  }

  // Chuỗi thuần xuống: con → cháu → chắt → chút → chít.
  if (steps.every((s) => s === 'down')) {
    if (steps.length === 1) return { title: gendered(to, 'Con trai', 'Con gái', 'Con'), note: null };
    if (steps.length === 2) return { title: gendered(to, 'Cháu trai', 'Cháu gái', 'Cháu'), note: null };
    if (steps.length === 3) return { title: gendered(to, 'Chắt trai', 'Chắt gái', 'Chắt'), note: null };
    if (steps.length === 4) return { title: 'Chút', note: null };
    if (steps.length === 5) return { title: 'Chít', note: null };
    return { title: null, note: `Hậu duệ cách ${steps.length} đời — vượt phạm vi danh xưng chuẩn.` };
  }

  switch (key) {
    case 'across': {
      // Vợ/chồng.
      return { title: gendered(to, 'Chồng', 'Vợ', 'Vợ/Chồng'), note: null };
    }
    case 'up,down': {
      // Anh/chị/em (kể cả cùng cha khác mẹ / cùng mẹ khác cha).
      const age = compareAge(to, from);
      if (age > 0) return { title: gendered(to, 'Anh', 'Chị', 'Anh/Chị'), note: null };
      if (age < 0) return { title: gendered(to, 'Em trai', 'Em gái', 'Em'), note: null };
      return {
        title: gendered(to, 'Anh/Em trai', 'Chị/Em gái', 'Anh/Chị/Em'),
        note: 'Không rõ năm sinh nên chưa phân biệt được anh/chị với em.',
      };
    }
    case 'up,up,down': {
      // Bác/chú/cô (bên nội) hoặc bác/cậu/dì (bên ngoại).
      const parent = personAt(1);
      const age = compareAge(to, parent);
      const paternal = parent.gender === 'male';
      const maternal = parent.gender === 'female';
      if (age > 0) return { title: 'Bác', note: null };
      if (age < 0) {
        if (paternal) return { title: gendered(to, 'Chú', 'Cô', 'Chú/Cô'), note: null };
        if (maternal) return { title: gendered(to, 'Cậu', 'Dì', 'Cậu/Dì'), note: null };
        return {
          title: gendered(to, 'Chú/Cậu', 'Cô/Dì', 'Chú/Cô/Cậu/Dì'),
          note: 'Không rõ bên nội hay bên ngoại.',
        };
      }
      return {
        title: 'Bác',
        note: 'Không rõ năm sinh nên mặc định xưng Bác (cách xưng tôn trọng với bậc trên).',
      };
    }
    case 'up,down,down': {
      // Cháu (con của anh/chị/em).
      return { title: gendered(to, 'Cháu trai', 'Cháu gái', 'Cháu'), note: null };
    }
    case 'up,down,across': {
      // Dâu/rể (vợ/chồng của anh/chị/em).
      const sibling = personAt(2);
      const age = compareAge(sibling, from);
      if (age > 0)
        return { title: to.gender === 'male' ? 'Anh rể' : to.gender === 'female' ? 'Chị dâu' : 'Anh rể/Chị dâu', note: null };
      if (age < 0)
        return { title: to.gender === 'male' ? 'Em rể' : to.gender === 'female' ? 'Em dâu' : 'Em rể/Em dâu', note: null };
      return {
        title: to.gender === 'male' ? 'Rể' : to.gender === 'female' ? 'Dâu' : 'Dâu/Rể',
        note: 'Không rõ năm sinh của anh/chị/em nên chưa phân biệt được dâu/rể bậc trên với bậc dưới.',
      };
    }
    case 'down,across': {
      // Con dâu / con rể.
      return { title: gendered(to, 'Con rể', 'Con dâu', 'Con dâu/rể'), note: null };
    }
    case 'across,up': {
      // Bố/mẹ vợ hoặc bố/mẹ chồng.
      if (from.gender === 'male')
        return { title: gendered(to, 'Bố vợ', 'Mẹ vợ', 'Bố/Mẹ vợ'), note: null };
      if (from.gender === 'female')
        return { title: gendered(to, 'Bố chồng', 'Mẹ chồng', 'Bố/Mẹ chồng'), note: null };
      return { title: gendered(to, 'Bố vợ/chồng', 'Mẹ vợ/chồng', 'Bố/Mẹ vợ/chồng'), note: null };
    }
    case 'across,down': {
      // Con riêng của vợ/chồng.
      return { title: gendered(to, 'Con trai riêng', 'Con gái riêng', 'Con riêng'), note: null };
    }
    case 'up,across': {
      // Vợ/chồng của cha/mẹ. Trong app, con thường chỉ được gắn với
      // một người (VD chỉ gắn với cha) nên "vợ của cha" phần lớn là mẹ
      // ruột bị thiếu link, không phải mẹ kế. Quy tắc:
      // - Mình đã có đủ 2 cha/mẹ ghi trong cây mà người này không phải
      //   một trong hai → đây là vợ/chồng khác của cha/mẹ → Cha dượng/
      //   Mẹ kế.
      // - Mình chỉ có 1 cha/mẹ ghi trong cây → xưng Cha/Mẹ (cách đọc
      //   phổ biến nhất; muốn phân biệt mẹ kế thì bổ sung link cha/mẹ
      //   cho mình trong cây).
      const myParents = new Set(
        (graph.get(fromId) ?? []).filter((e) => e.step === 'up').map((e) => e.to),
      );
      if (myParents.size >= 2) {
        return {
          title: gendered(to, 'Cha dượng', 'Mẹ kế', 'Cha/Mẹ kế'),
          note: 'Bạn đã có đủ cha/mẹ ghi trong cây nên đây là vợ/chồng khác của cha/mẹ.',
        };
      }
      return { title: gendered(to, 'Cha', 'Mẹ', 'Cha/Mẹ'), note: null };
    }
    default: {
      return {
        title: null,
        note: 'Hai người có quan hệ trong cây gia phả nhưng chưa xác định được danh xưng chuẩn cho dạng đường đi này.',
      };
    }
  }
}
