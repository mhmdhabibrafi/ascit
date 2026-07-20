import { defaultMasterData } from "@/lib/master-data-defaults";
import { prisma } from "@/lib/prisma";

export async function ensureDefaultMasterData() {
  for (const unit of defaultMasterData.units) {
    await prisma.unit.upsert({
      where: { code: unit.code },
      update: { name: unit.name, description: unit.description },
      create: unit
    });
  }

  const units = await prisma.unit.findMany({ select: { id: true, code: true } });
  const unitByCode = new Map(units.map((unit) => [unit.code, unit.id]));

  for (const room of defaultMasterData.rooms) {
    const unitId = unitByCode.get(room.unitCode);
    if (!unitId) continue;

    const existingRoom = await prisma.room.findFirst({
      where: {
        unitId,
        OR: [{ code: room.code }, { name: room.name }]
      },
      select: { id: true }
    });

    if (existingRoom) {
      await prisma.room.update({
        where: { id: existingRoom.id },
        data: { name: room.name, code: room.code, description: room.description }
      });
      continue;
    }

    await prisma.room.create({
      data: {
        name: room.name,
        code: room.code,
        description: room.description,
        unitId
      }
    });
  }

  for (const category of defaultMasterData.categories) {
    const existingCategory = await prisma.assetCategory.findFirst({
      where: {
        OR: [{ code: category.code }, { name: category.name }]
      },
      select: { id: true }
    });

    if (existingCategory) {
      await prisma.assetCategory.update({
        where: { id: existingCategory.id },
        data: {
          name: category.name,
          code: category.code,
          description: category.description
        }
      });
      continue;
    }

    await prisma.assetCategory.create({ data: category });
  }

  for (const brand of defaultMasterData.brands) {
    await prisma.brand.upsert({
      where: { name: brand.name },
      update: { description: brand.description },
      create: brand
    });
  }

  for (const vendor of defaultMasterData.vendors) {
    await prisma.vendor.upsert({
      where: { name: vendor.name },
      update: {
        contact: vendor.contact,
        phone: vendor.phone,
        email: vendor.email,
        address: vendor.address
      },
      create: vendor
    });
  }

  for (const technician of defaultMasterData.technicians) {
    await prisma.technician.upsert({
      where: { name: technician.name },
      update: {
        phone: technician.phone,
        specialty: technician.specialty,
        isActive: true
      },
      create: {
        ...technician,
        isActive: true
      }
    });
  }

  const [unitsCount, roomsCount, categoriesCount, brandsCount, vendorsCount, techniciansCount] = await Promise.all([
    prisma.unit.count(),
    prisma.room.count(),
    prisma.assetCategory.count(),
    prisma.brand.count(),
    prisma.vendor.count(),
    prisma.technician.count()
  ]);

  return {
    units: unitsCount,
    rooms: roomsCount,
    categories: categoriesCount,
    brands: brandsCount,
    vendors: vendorsCount,
    technicians: techniciansCount
  };
}
