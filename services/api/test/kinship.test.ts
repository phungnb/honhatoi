import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findKinship, KinshipPerson, KinshipRelation } from '../src/genealogy/kinship';

// Cây mẫu:
//   Cụ (1920) ─┬─ Ông Cả (1945) ── Bác Hai (1968) ── Anh Hùng (1995)
//              └─ Ông Út (1950) ─┬─ Bố (1970) ─┬─ Tôi (1998)
//                                │             └─ Em gái (2002)
//                                └─ Cô Ba (1975, nữ) ── Bé Na (2005, con cô Ba)
const P = (id: string, gender: string | null, year: number | null): KinshipPerson => ({
  id,
  fullName: id,
  gender,
  dateOfBirth: year ? `${year}-01-01` : null,
});
const persons = [
  P('cu', 'male', 1920),
  P('ongCa', 'male', 1945),
  P('ongUt', 'male', 1950),
  P('bacHai', 'male', 1968),
  P('anhHung', 'male', 1995),
  P('bo', 'male', 1970),
  P('coBa', 'female', 1975),
  P('toi', 'male', 1998),
  P('emGai', 'female', 2002),
  P('beNa', 'female', 2005),
  P('chauHung', 'male', 2020),
];
const parent = (a: string, b: string): KinshipRelation[] => [
  { personId: a, relatedPersonId: b, relationshipType: 'parent' },
  { personId: b, relatedPersonId: a, relationshipType: 'child' },
];
const rels = [
  ...parent('cu', 'ongCa'),
  ...parent('cu', 'ongUt'),
  ...parent('ongCa', 'bacHai'),
  ...parent('bacHai', 'anhHung'),
  ...parent('ongUt', 'bo'),
  ...parent('ongUt', 'coBa'),
  ...parent('bo', 'toi'),
  ...parent('bo', 'emGai'),
  ...parent('coBa', 'beNa'),
  ...parent('anhHung', 'chauHung'),
];
const title = (from: string, to: string) => findKinship(from, to, persons, rels)?.title;

test('quan hệ trực hệ và anh chị em ruột', () => {
  assert.equal(title('toi', 'bo'), 'Cha');
  assert.equal(title('toi', 'ongUt'), 'Ông');
  assert.equal(title('toi', 'cu'), 'Cụ ông');
  assert.equal(title('toi', 'emGai'), 'Em gái');
  assert.equal(title('emGai', 'toi'), 'Anh');
});

test('cô ruột bên nội', () => {
  assert.equal(title('toi', 'coBa'), 'Cô');
});

test('anh chị em họ theo vai của cha mẹ, không theo tuổi', () => {
  // Bé Na sinh sau tôi nhưng mẹ (cô Ba) là em của bố → em họ.
  assert.equal(title('toi', 'beNa'), 'Em họ');
  // Bé Na gọi tôi là anh họ dù… tôi lớn tuổi hơn; quan trọng là vai bố > cô Ba.
  assert.equal(title('beNa', 'toi'), 'Anh họ');
});

test('ông bác và bác họ', () => {
  // Ông Cả là anh của ông nội → Ông bác.
  assert.equal(title('toi', 'ongCa'), 'Ông bác');
  // Bác Hai là con ông bác → Bác họ.
  assert.equal(title('toi', 'bacHai'), 'Bác họ');
  // Ngược lại, anh Hùng nhìn ông Út (em ông nội) → Ông chú.
  assert.equal(title('anhHung', 'ongUt'), 'Ông chú');
  // Anh Hùng nhìn bố tôi (con ông chú) → Chú họ.
  assert.equal(title('anhHung', 'bo'), 'Chú họ');
});

test('cháu họ, và nhánh quá xa thì không xưng bừa', () => {
  // Anh Hùng là con của bác Hai (anh họ của bố) → cháu họ của bố.
  assert.equal(title('bo', 'anhHung'), 'Cháu họ');
  assert.equal(title('beNa', 'chauHung'), null);
});

test('xưng theo miền: Bắc/Nam và vợ/chồng của cô chú', () => {
  // Chồng cô Ba, vợ bố (mẹ), chị gái lớn của bố (Bác gái ở Bắc, Cô ở Nam).
  const more = [P('duong', 'male', 1972), P('me', 'female', 1972), P('coCa', 'female', 1965)];
  const sp = (a: string, b: string): KinshipRelation[] => [
    { personId: a, relatedPersonId: b, relationshipType: 'spouse' },
    { personId: b, relatedPersonId: a, relationshipType: 'spouse' },
  ];
  const ps = [...persons, ...more];
  const rs = [...rels, ...sp('coBa', 'duong'), ...sp('bo', 'me'), ...parent('me', 'toi'), ...parent('ongUt', 'coCa')];
  const t = (to: string, mien?: 'bac' | 'nam') => findKinship('toi', to, ps, rs, mien)?.title;
  assert.equal(t('bo', 'bac'), 'Bố');
  assert.equal(t('bo', 'nam'), 'Ba');
  assert.equal(t('me', 'nam'), 'Má');
  assert.equal(t('coCa', 'bac'), 'Bác');
  assert.equal(t('coCa', 'nam'), 'Cô');
  assert.equal(t('duong', 'bac'), 'Chú');
  assert.equal(t('duong', 'nam'), 'Dượng');
  // Không chọn miền: giữ cách cũ.
  assert.equal(t('bo'), 'Cha');
});
