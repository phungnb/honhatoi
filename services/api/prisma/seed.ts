import { PrismaClient, LineageRole } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed demo — chạy bằng: npx prisma db seed
 * Tạo: 1 user admin demo, 2 dòng họ (Nguyễn tại Đồng Nai, Trần tại TP.HCM),
 * vài hồ sơ gia phả mẫu (có người đã mất + phần mộ + ghi chú).
 */
async function main() {
  const demoPhone = '+84900000001';
  const existing = await prisma.user.findUnique({ where: { phone: demoPhone } });
  if (existing) {
    console.log('Seed đã chạy trước đó (tìm thấy user demo) — bỏ qua.');
    return;
  }

  const admin = await prisma.user.create({
    data: {
      phone: demoPhone,
      displayName: 'Quản trị demo',
      status: 'ACTIVE',
      profile: { create: { fullName: 'Quản trị demo', hometown: 'Đồng Nai' } },
    },
  });

  // ---------------- Dòng họ 1: Nguyễn tại Đồng Nai ----------------
  const nguyen = await prisma.lineage.create({
    data: {
      name: 'Gia phả họ Nguyễn tại Đồng Nai',
      hometownProvince: 'Đồng Nai',
      hometownCommune: 'Tân Lập',
      ancestralHallAddress: 'Nhà thờ họ Nguyễn, ấp Tân Lập, Đồng Nai',
      visibility: 'invite_only',
      createdBy: admin.id,
      ownerUserId: admin.id,
    },
  });
  await prisma.lineageMembership.create({
    data: {
      lineageId: nguyen.id,
      userId: admin.id,
      role: LineageRole.ADMIN,
      status: 'approved',
      joinedAt: new Date(),
    },
  });

  const to = await prisma.familyPerson.create({
    data: {
      lineageId: nguyen.id,
      fullName: 'Nguyễn Văn Tổ',
      gender: 'male',
      dateOfBirth: new Date('1890-01-01'),
      birthYearOnly: true,
      dateOfDeath: new Date('1965-09-15'),
      burialPlace: 'Khu mộ tổ, nghĩa trang dòng họ ấp Tân Lập',
      bio: 'Người khai sinh dòng họ Nguyễn tại Đồng Nai. Lập nhà thờ họ năm 1952.',
      generation: 1,
      branch: 'Chi trưởng',
      verificationStatus: 'VERIFIED',
      createdBy: admin.id,
    },
  });
  const binh = await prisma.familyPerson.create({
    data: {
      lineageId: nguyen.id,
      fullName: 'Nguyễn Văn Bình',
      gender: 'male',
      dateOfBirth: new Date('1945-03-20'),
      dateOfDeath: new Date('2010-11-02'),
      burialPlace: 'Nghĩa trang ấp Tân Lập, khu B',
      bio: 'Trưởng chi đời 2, có công trùng tu nhà thờ họ năm 1998.',
      generation: 2,
      branch: 'Chi trưởng',
      verificationStatus: 'VERIFIED',
      createdBy: admin.id,
    },
  });
  const cuc = await prisma.familyPerson.create({
    data: {
      lineageId: nguyen.id,
      fullName: 'Trần Thị Cúc',
      gender: 'female',
      dateOfBirth: new Date('1948-06-10'),
      dateOfDeath: new Date('2018-02-14'),
      burialPlace: 'Nghĩa trang ấp Tân Lập, khu B',
      generation: 2,
      branch: 'Chi trưởng',
      verificationStatus: 'VERIFIED',
      createdBy: admin.id,
    },
  });
  const hung = await prisma.familyPerson.create({
    data: {
      lineageId: nguyen.id,
      fullName: 'Nguyễn Văn Hùng',
      gender: 'male',
      dateOfBirth: new Date('1975-08-25'),
      hometown: 'Đồng Nai',
      occupation: 'Kỹ sư',
      generation: 3,
      branch: 'Chi trưởng',
      roleInLineage: 'Trưởng chi',
      verificationStatus: 'VERIFIED',
      createdBy: admin.id,
    },
  });

  // Quan hệ hai chiều (parent <-> child), cùng transaction.
  await prisma.$transaction([
    prisma.familyRelationship.create({
      data: { lineageId: nguyen.id, personId: to.id, relatedPersonId: binh.id, relationshipType: 'parent', createdBy: admin.id },
    }),
    prisma.familyRelationship.create({
      data: { lineageId: nguyen.id, personId: binh.id, relatedPersonId: to.id, relationshipType: 'child', createdBy: admin.id },
    }),
    prisma.familyRelationship.create({
      data: { lineageId: nguyen.id, personId: binh.id, relatedPersonId: cuc.id, relationshipType: 'spouse', createdBy: admin.id },
    }),
    prisma.familyRelationship.create({
      data: { lineageId: nguyen.id, personId: cuc.id, relatedPersonId: binh.id, relationshipType: 'spouse', createdBy: admin.id },
    }),
    prisma.familyRelationship.create({
      data: { lineageId: nguyen.id, personId: binh.id, relatedPersonId: hung.id, relationshipType: 'parent', createdBy: admin.id },
    }),
    prisma.familyRelationship.create({
      data: { lineageId: nguyen.id, personId: hung.id, relatedPersonId: binh.id, relationshipType: 'child', createdBy: admin.id },
    }),
  ]);
  await prisma.lineage.update({ where: { id: nguyen.id }, data: { founderPersonId: to.id } });

  // ---------------- Dòng họ 2: Trần tại TP.HCM ----------------
  const tran = await prisma.lineage.create({
    data: {
      name: 'Gia phả họ Trần tại TP. Hồ Chí Minh',
      hometownProvince: 'TP. Hồ Chí Minh',
      hometownCommune: 'Bình Thọ',
      ancestralHallAddress: 'Nhà thờ họ Trần, phường Bình Thọ, TP. Hồ Chí Minh',
      visibility: 'invite_only',
      createdBy: admin.id,
      ownerUserId: admin.id,
    },
  });
  await prisma.lineageMembership.create({
    data: {
      lineageId: tran.id,
      userId: admin.id,
      role: LineageRole.ADMIN,
      status: 'approved',
      joinedAt: new Date(),
    },
  });
  const tam = await prisma.familyPerson.create({
    data: {
      lineageId: tran.id,
      fullName: 'Trần Văn Tâm',
      gender: 'male',
      dateOfBirth: new Date('1935-04-12'),
      birthYearOnly: true,
      dateOfDeath: new Date('2005-09-08'),
      burialPlace: 'Nghĩa trang Bình Hưng Hòa, khu A3',
      bio: 'Người sáng lập chi họ Trần tại Sài Gòn năm 1962.',
      generation: 1,
      branch: 'Chi 1',
      verificationStatus: 'VERIFIED',
      createdBy: admin.id,
    },
  });
  const long = await prisma.familyPerson.create({
    data: {
      lineageId: tran.id,
      fullName: 'Trần Văn Long',
      gender: 'male',
      dateOfBirth: new Date('1970-12-01'),
      generation: 2,
      branch: 'Chi 1',
      roleInLineage: 'Trưởng họ',
      verificationStatus: 'VERIFIED',
      createdBy: admin.id,
    },
  });
  await prisma.$transaction([
    prisma.familyRelationship.create({
      data: { lineageId: tran.id, personId: tam.id, relatedPersonId: long.id, relationshipType: 'parent', createdBy: admin.id },
    }),
    prisma.familyRelationship.create({
      data: { lineageId: tran.id, personId: long.id, relatedPersonId: tam.id, relationshipType: 'child', createdBy: admin.id },
    }),
  ]);
  await prisma.lineage.update({ where: { id: tran.id }, data: { founderPersonId: tam.id } });

  console.log('Seed xong: 1 user admin, 2 dòng họ, 6 hồ sơ gia phả, quan hệ hai chiều.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
