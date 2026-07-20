import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { settingDefinitions } from "../src/lib/system-settings";

const prisma = new PrismaClient();

const now = new Date("2026-06-30T00:00:00.000Z");

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function warrantyStatus(endDate?: string | null) {
  if (!endDate) return "HABIS" as const;
  const diffDays = Math.ceil((date(endDate).getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return "HABIS" as const;
  if (diffDays <= 30) return "HAMPIR_HABIS" as const;
  return "AKTIF" as const;
}

function scoreStatus(score: number) {
  if (score >= 80) return "PRIORITAS_PENGGANTIAN" as const;
  if (score >= 60) return "DIREKOMENDASIKAN_UPGRADE" as const;
  if (score >= 30) return "PERLU_DIPANTAU" as const;
  return "AMAN" as const;
}

function seedPassword(envName: string) {
  const value = process.env[envName]?.trim();
  const isPlaceholder = value ? /ganti|change-this|password/i.test(value) : true;
  if (value && !isPlaceholder && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)) {
    return value;
  }
  throw new Error(`${envName} wajib diisi dengan password kuat non-placeholder sebelum menjalankan seed.`);
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error("Seed destruktif diblokir di production. Gunakan migration atau set ALLOW_DESTRUCTIVE_SEED=true secara eksplisit.");
  }
  await prisma.aiRecommendationDetail.deleteMany();
  await prisma.aiAssetRecommendation.deleteMany();
  await prisma.aiAnalysisRun.deleteMany();
  await prisma.assetReplacementRecommendation.deleteMany();
  await prisma.serviceRecord.deleteMany();
  await prisma.assetMutation.deleteMany();
  await prisma.assetLifecycleLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.role.deleteMany();

  const roleRows = await Promise.all(
    [
      ["SUPER_ADMIN", "Kontrol penuh seluruh sistem"],
      ["ADMIN_IT", "Admin operasional divisi IT SUPPORT"],
      ["STAF_IT", "Staff teknis maintenance dan perbaikan divisi IT SUPPORT"],
      ["KEPALA_IT", "Kepala IT untuk approval, monitoring, dan keputusan divisi IT SUPPORT"],
      ["MANAJEMEN", "Monitoring eksekutif dan laporan"]
    ].map(([name, description]) =>
      prisma.role.create({
        data: {
          name: name as Prisma.RoleCreateInput["name"],
          description
        }
      })
    )
  );
  const roles = Object.fromEntries(roleRows.map((role) => [role.name, role]));

  const password = async (plain: string) => bcrypt.hash(plain, 10);
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@ascit.local",
        name: "Admin IT Support",
        passwordHash: await password(seedPassword("SEED_ADMIN_PASSWORD")),
        roleId: roles.ADMIN_IT.id
      }
    }),
    prisma.user.create({
      data: {
        email: "staf@ascit.local",
        name: "Staff IT Support",
        passwordHash: await password(seedPassword("SEED_STAF_PASSWORD")),
        roleId: roles.STAF_IT.id
      }
    }),
    prisma.user.create({
      data: {
        email: "kepala@ascit.local",
        name: "Kepala IT Support",
        passwordHash: await password(seedPassword("SEED_KEPALA_PASSWORD")),
        roleId: roles.KEPALA_IT.id
      }
    }),
    prisma.user.create({
      data: {
        email: "manajemen@ascit.local",
        name: "Manajemen RS",
        passwordHash: await password(seedPassword("SEED_MANAJEMEN_PASSWORD")),
        roleId: roles.MANAJEMEN.id
      }
    })
  ]);
  const admin = users[0];
  const staf = users[1];

  await prisma.systemSetting.createMany({
    data: settingDefinitions.map((definition) => ({
      key: definition.key,
      value: definition.defaultValue as Prisma.InputJsonValue,
      description: definition.description
    }))
  });

  const unitRows = await Promise.all(
    [
      ["Pendaftaran", "PDF"],
      ["Farmasi", "FRM"],
      ["Kasir", "KSR"],
      ["Laboratorium", "LAB"],
      ["Radiologi", "RAD"],
      ["Poli Anak", "PAN"],
      ["Rawat Inap", "RIN"],
      ["IT", "IT"]
    ].map(([name, code]) => prisma.unit.create({ data: { name, code } }))
  );
  const units = Object.fromEntries(unitRows.map((unit) => [unit.name, unit]));

  const roomSpecs = [
    // Pendaftaran
    ["Pendaftaran", "Lt1", "PDF_L1"],
    ["Pendaftaran", "Lt2", "PDF_L2"],
    
    // Farmasi
    ["Farmasi", "Lt1", "FRM_L1"],
    ["Farmasi", "Lt2", "FRM_L2"],
    
    // Kasir
    ["Kasir", "Lt1", "KSR_L1"],
    ["Kasir", "Lt2", "KSR_L2"],
    
    // Laboratorium
    ["Laboratorium", "Lt1", "LAB_L1"],
    ["Laboratorium", "Lt2", "LAB_L2"],
    
    // Radiologi
    ["Radiologi", "Lt1", "RAD_L1"],
    ["Radiologi", "Lt2", "RAD_L2"],
    
    // Poli Anak
    ["Poli Anak", "Lt1", "PAN_L1"],
    ["Poli Anak", "Lt2", "PAN_L2"],
    ["Poli Anak", "MAC ADDRESS PC NS POLI", "PAN_MAC"],
    
    // Rawat Inap
    ["Rawat Inap", "Lt1", "RIN_L1"],
    ["Rawat Inap", "Lt2", "RIN_L2"],
    ["Rawat Inap", "Lt3", "RIN_L3"],
    ["Rawat Inap", "Lt5", "RIN_L5"],
    ["Rawat Inap", "Lt6", "RIN_L6"],
    ["Rawat Inap", "Lt7", "RIN_L7"],
    ["Rawat Inap", "Lt1.Gd_Baru", "RIN_L1GB"],
    ["Rawat Inap", "Lt2.Gd_Baru", "RIN_L2GB"],
    ["Rawat Inap", "Lt3.Gd_Baru", "RIN_L3GB"],
    ["Rawat Inap", "Lt5.Gd_Baru", "RIN_L5GB"],
    ["Rawat Inap", "Gedung C", "RIN_GC"],
    
    // IT
    ["IT", "Office", "IT_OFF"],
    ["IT", "Lt1", "IT_L1"],
    ["IT", "Lt2", "IT_L2"]
  ];
  const roomRows = await Promise.all(
    roomSpecs.map(([unitName, name, code]) =>
      prisma.room.create({
        data: {
          name,
          code,
          unitId: units[unitName].id
        }
      })
    )
  );
  const rooms = Object.fromEntries(
    roomRows.map((room) => {
      const unit = unitRows.find((u) => u.id === room.unitId);
      return [`${unit?.name}_${room.name}`, room];
    })
  );

  const categoryRows = await Promise.all(
    [
      "Komputer",
      "Laptop",
      "Printer",
      "Scanner",
      "Access Point",
      "Switch",
      "UPS",
      "CCTV",
      "Server",
      "Perangkat Antrian"
    ].map((name, index) =>
      prisma.assetCategory.create({
        data: {
          name,
          code: `CAT-${String(index + 1).padStart(2, "0")}`
        }
      })
    )
  );
  const categories = Object.fromEntries(categoryRows.map((category) => [category.name, category]));

  const brandRows = await Promise.all(
    ["Lenovo", "HP", "Epson", "TP Link", "Dell", "Acer", "Canon", "Cisco", "APC", "Hikvision"].map((name) =>
      prisma.brand.create({ data: { name } })
    )
  );
  const brands = Object.fromEntries(brandRows.map((brand) => [brand.name, brand]));

  const vendorRows = await Promise.all(
    [
      "Vendor Komputer Riau",
      "Vendor Printer Riau",
      "Vendor Jaringan Riau",
      "Vendor Server Riau",
      "Vendor Infrastruktur Riau",
      "Vendor CCTV Riau",
      "Vendor Antrian Riau",
      "Vendor Maintenance IT"
    ].map((name, index) =>
      prisma.vendor.create({
        data: {
          name,
          contact: `PIC ${index + 1}`,
          phone: `0812-0000-00${index + 1}`,
          email: `vendor${index + 1}@example.local`,
          address: "Pekanbaru"
        }
      })
    )
  );
  const vendors = Object.fromEntries(vendorRows.map((vendor) => [vendor.name, vendor]));

  await Promise.all(
    [
      ["Budi Santoso", "Komputer dan printer"],
      ["Rina Mahendra", "Jaringan"],
      ["Fajar Pratama", "Server"],
      ["Dewi Kartika", "CCTV dan periferal"]
    ].map(([name, specialty]) => prisma.technician.create({ data: { name, specialty } }))
  );
  // console.log("ASCIT production database seeding completed.");
  // return;

  const assetsInput = [
    ["IT-PC-2026-001", "PC Pendaftaran 1", "Komputer", "Lenovo", "ThinkCentre M720", "SN-PC-001", "Pendaftaran", "Lt1", "Intel Core i5 Gen 8", "8 GB", "SSD 256 GB", "Windows 11", "2023-01-10", "2026-07-20", "BAIK", "AKTIF", "192.168.1.10", "A1:B2:C3:D4:E5:F6"],
    ["IT-PC-2026-002", "PC Farmasi 1", "Komputer", "HP", "ProDesk 400 G4", "SN-PC-002", "Farmasi", "Lt1", "Intel Pentium G4560", "4 GB", "HDD 500 GB", "Windows 10", "2018-02-12", "2021-02-12", "LAYAK_GANTI", "LAYAK_GANTI", "192.168.1.21", "B1:C2:D3:E4:F5:A6"],
    ["IT-PRN-2026-003", "Printer Farmasi", "Printer", "Epson", "L3210", "SN-PRN-003", "Farmasi", "Lt1", "Tidak Ada", "Tidak Ada", "Tidak Ada", "Tidak Ada", "2022-05-15", "2026-07-07", "BAIK", "AKTIF", "192.168.1.22", "C1:D2:E3:F4:A5:B6"],
    ["IT-AP-2026-004", "Access Point Poli Anak", "Access Point", "TP Link", "EAP225", "SN-AP-004", "Poli Anak", "Lt1", "Tidak Ada", "Tidak Ada", "Tidak Ada", "Firmware AP", "2021-03-20", "2024-03-20", "RUSAK_RINGAN", "DALAM_PERBAIKAN", "192.168.1.31", "D1:E2:F3:A4:B5:C6"],
    ["IT-SRV-2026-005", "Server Aplikasi Internal", "Server", "Dell", "PowerEdge R440", "SN-SRV-005", "IT", "Lt2", "Intel Xeon Silver", "32 GB", "SSD 1 TB", "Linux Server", "2020-01-22", "2025-01-22", "BAIK", "AKTIF", "192.168.20.12", "E1:F2:A3:B4:C5:D6"],
    ["IT-LPT-2026-006", "Laptop Kepala IT", "Laptop", "HP", "ProBook 440 G8", "SN-LPT-006", "IT", "Office", "Intel Core i7 Gen 11", "16 GB", "SSD 512 GB", "Windows 11 Pro", "2024-02-12", "2027-02-12", "BAIK", "AKTIF", "192.168.1.42", "F1:A2:B3:C4:D5:E6"],
    ["IT-SCN-2026-007", "Scanner Administrasi", "Scanner", "Canon", "DR-C240", "SN-SCN-007", "Pendaftaran", "Lt2", "Tidak Ada", "Tidak Ada", "Tidak Ada", "Tidak Ada", "2020-07-18", "2023-07-18", "RUSAK_BERAT", "LAYAK_GANTI", "", ""],
    ["IT-SW-2026-008", "Switch Core Lantai 2", "Switch", "Cisco", "CBS350-24T", "SN-SW-008", "IT", "Lt2", "Tidak Ada", "Tidak Ada", "Tidak Ada", "Firmware Switch", "2021-11-02", "2026-07-18", "BAIK", "AKTIF", "192.168.10.2", "A7:B8:C9:D1:E2:F3"],
    ["IT-UPS-2026-009", "UPS Server SIMRS", "UPS", "APC", "Smart-UPS 1500VA", "SN-UPS-009", "IT", "Lt2", "Tidak Ada", "Tidak Ada", "Tidak Ada", "Tidak Ada", "2019-10-10", "2022-10-10", "RUSAK_RINGAN", "MAINTENANCE", "", ""],
    ["IT-CCTV-2026-010", "CCTV Koridor Rawat Inap", "CCTV", "Hikvision", "DS-2CD2143", "SN-CCTV-010", "Rawat Inap", "Lt2", "Tidak Ada", "Tidak Ada", "NVR", "Firmware CCTV", "2023-08-09", "2026-08-09", "BAIK", "AKTIF", "192.168.2.18", "B7:C8:D9:E1:F2:A3"],
    ["IT-PC-2026-011", "PC Kasir Rawat Jalan", "Komputer", "Acer", "Veriton X", "SN-PC-011", "Kasir", "Lt1", "Intel Core i5 Gen 9", "8 GB", "SSD 256 GB", "Windows 10", "2022-09-01", "2026-07-06", "BAIK", "AKTIF", "192.168.1.51", "C7:D8:E9:F1:A2:B3"],
    ["IT-PRN-2026-012", "Printer Label Lab", "Printer", "Epson", "L3210", "SN-PRN-012", "Laboratorium", "Lt1", "Tidak Ada", "Tidak Ada", "Tidak Ada", "Tidak Ada", "2024-06-05", "2027-06-05", "BAIK", "AKTIF", "192.168.4.22", "D7:E8:F9:A1:B2:C3"],
    ["IT-AP-2026-013", "Access Point Lobby Anak", "Access Point", "TP Link", "EAP610", "SN-AP-013", "Poli Anak", "Lt2", "Tidak Ada", "Tidak Ada", "Tidak Ada", "UniFi OS", "2023-05-25", "2026-05-25", "BAIK", "AKTIF", "192.168.1.33", "E7:F8:A9:B1:C2:D3"],
    ["IT-LPT-2026-014", "Laptop Koordinator Rawat Inap", "Laptop", "Lenovo", "ThinkPad E14", "SN-LPT-014", "Rawat Inap", "Lt1.Gd_Baru", "Intel Core i5 Gen 10", "8 GB", "SSD 512 GB", "Windows 11", "2025-01-17", "2028-01-17", "BAIK", "AKTIF", "192.168.5.14", "F7:A8:B9:C1:D2:E3"],
    ["IT-PC-2026-015", "PC Radiologi Viewer 1", "Komputer", "HP", "EliteDesk 800", "SN-PC-015", "Radiologi", "Lt1", "Intel Core i7 Gen 7", "8 GB", "HDD 1 TB", "Windows 10", "2019-04-04", "2022-04-04", "RUSAK_RINGAN", "AKTIF", "192.168.6.10", "A8:B9:C1:D2:E3:F4"],
    ["IT-PC-2026-016", "PC Laboratorium Admin", "Komputer", "Lenovo", "ThinkCentre M710", "SN-PC-016", "Laboratorium", "Lt2", "Intel Core i3 Gen 6", "4 GB", "HDD 500 GB", "Windows 8", "2017-09-11", "2020-09-11", "LAYAK_GANTI", "LAYAK_GANTI", "192.168.4.10", "B8:C9:D1:E2:F3:A4"],
    ["IT-PRN-2026-017", "Printer Kasir Rawat Inap", "Printer", "Epson", "LQ-310", "SN-PRN-017", "Kasir", "Lt2", "Tidak Ada", "Tidak Ada", "Tidak Ada", "Tidak Ada", "2021-12-01", "2024-12-01", "RUSAK_RINGAN", "DALAM_PERBAIKAN", "192.168.1.55", "C8:D9:E1:F2:A3:B4"],
    ["IT-AP-2026-018", "Access Point Rawat Inap", "Access Point", "TP Link", "EAP245", "SN-AP-018", "Rawat Inap", "Lt2", "Tidak Ada", "Tidak Ada", "Tidak Ada", "Firmware AP", "2020-06-21", "2023-06-21", "RUSAK_RINGAN", "MAINTENANCE", "192.168.2.33", "D8:E9:F1:A2:B3:C4"],
    ["IT-SRV-2026-019", "Server Backup Internal", "Server", "Dell", "PowerEdge T440", "SN-SRV-019", "IT", "Lt2", "Intel Xeon Bronze", "64 GB", "RAID SSD 4 TB", "Ubuntu Server 22.04", "2021-01-14", "2026-07-25", "BAIK", "AKTIF", "192.168.20.20", "E8:F9:A1:B2:C3:D4"],
    ["IT-UPS-2026-020", "UPS Pendaftaran", "UPS", "APC", "Back-UPS 1200VA", "SN-UPS-020", "Pendaftaran", "Lt1", "Tidak Ada", "Tidak Ada", "Tidak Ada", "Tidak Ada", "2022-11-30", "2025-11-30", "BAIK", "AKTIF", "", ""],
    ["IT-CCTV-2026-021", "CCTV Farmasi", "CCTV", "Hikvision", "DS-2CD1023G0", "SN-CCTV-021", "Farmasi", "Lt2", "Tidak Ada", "Tidak Ada", "NVR", "Firmware CCTV", "2022-06-25", "2026-07-10", "BAIK", "AKTIF", "192.168.2.21", "F8:A9:B1:C2:D3:E4"],
    ["IT-SCN-2026-022", "Scanner Radiologi", "Scanner", "Canon", "LiDE 400", "SN-SCN-022", "Radiologi", "Lt1", "Tidak Ada", "Tidak Ada", "Tidak Ada", "Tidak Ada", "2023-10-12", "2026-10-12", "BAIK", "AKTIF", "", ""],
    ["IT-ANTRI-2026-023", "Kiosk Antrian Pendaftaran", "Perangkat Antrian", "Lenovo", "Kiosk Touch 21", "SN-ANTRI-023", "Pendaftaran", "Lt1", "Intel Core i3 Gen 4", "4 GB", "HDD 500 GB", "Windows 7", "2018-12-14", "2021-12-14", "LAYAK_GANTI", "LAYAK_GANTI", "192.168.3.10", "A9:B1:C2:D3:E4:F5"],
    ["IT-PC-2026-024", "PC Poli Anak 1", "Komputer", "Acer", "Veriton M", "SN-PC-024", "Poli Anak", "MAC ADDRESS PC NS POLI", "Intel Core i5 Gen 8", "8 GB", "SSD 256 GB", "Windows 11", "2023-03-16", "2026-03-16", "BAIK", "AKTIF", "192.168.7.10", "B9:C1:D2:E3:F4:A5"],
    ["IT-LPT-2026-025", "Laptop Manajemen Aset", "Laptop", "HP", "EliteBook 840", "SN-LPT-025", "IT", "Office", "Intel Core i5 Gen 12", "16 GB", "SSD 512 GB", "Windows 11", "2025-05-08", "2028-05-08", "BAIK", "AKTIF", "192.168.1.45", "C9:D1:E2:F3:A4:B5"]
  ] as const;

  const createdAssets = [];
  for (const [index, item] of assetsInput.entries()) {
    const [
      assetCode,
      assetName,
      categoryName,
      brandName,
      model,
      serialNumber,
      unitName,
      roomName,
      processor,
      ram,
      storage,
      operatingSystem,
      purchaseDate,
      warrantyEndDate,
      conditionStatus,
      lifecycleStatus,
      ipAddress,
      macAddress
    ] = item;
    const qrToken = `ASCIT-${assetCode}`;
    const qrCodeUrl = await QRCode.toDataURL(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/public/assets/${encodeURIComponent(qrToken)}`);
    const asset = await prisma.asset.create({
      data: {
        assetCode,
        assetName,
        categoryId: categories[categoryName].id,
        brandId: brands[brandName].id,
        vendorId:
          vendors[
            categoryName === "Printer"
              ? "Vendor Printer Riau"
              : categoryName === "Access Point" || categoryName === "Switch"
                ? "Vendor Jaringan Riau"
                : categoryName === "Server"
                  ? "Vendor Server Riau"
                  : categoryName === "CCTV"
                    ? "Vendor CCTV Riau"
                    : categoryName === "Perangkat Antrian"
                      ? "Vendor Antrian Riau"
                      : "Vendor Komputer Riau"
          ].id,
        unitId: units[unitName].id,
        roomId: rooms[`${unitName}_${roomName}`].id,
        responsibleUserId: staf.id,
        model,
        serialNumber,
        ipAddress: ipAddress || null,
        macAddress: macAddress || null,
        operatingSystem,
        processor,
        ram,
        storage,
        purchaseDate: date(purchaseDate),
        purchasePrice: new Prisma.Decimal(4500000 + index * 275000),
        invoiceNumber: `INV-ASCIT-${String(index + 1).padStart(3, "0")}`,
        warrantyStartDate: date(purchaseDate),
        warrantyEndDate: date(warrantyEndDate),
        conditionStatus: conditionStatus as Prisma.AssetCreateInput["conditionStatus"],
        lifecycleStatus: lifecycleStatus as Prisma.AssetCreateInput["lifecycleStatus"],
        qrToken,
        qrCodeUrl,
        notes: "Data seed ASCIT untuk simulasi manajemen aset IT rumah sakit.",
        createdById: admin.id,
        lifecycleLogs: {
          create: {
            status: lifecycleStatus as Prisma.AssetLifecycleLogCreateWithoutAssetInput["status"],
            description: "Status awal aset dari data seed.",
            createdById: admin.id
          }
        }
      }
    });
    createdAssets.push(asset);
  }
  const assets = Object.fromEntries(createdAssets.map((asset) => [asset.assetCode, asset]));

  const mutationAssets = createdAssets.slice(0, 10);
  for (const [index, asset] of mutationAssets.entries()) {
    const toUnit = unitRows[(index + 2) % unitRows.length];
    const toRoom = roomRows.find((room) => room.unitId === toUnit.id) ?? roomRows[0];
    const status = index % 4 === 0 ? "MENUNGGU" : index % 5 === 0 ? "DITOLAK" : "DISETUJUI";
    await prisma.assetMutation.create({
      data: {
        assetId: asset.id,
        fromUnitId: asset.unitId,
        fromRoomId: asset.roomId,
        toUnitId: toUnit.id,
        toRoomId: toRoom.id,
        oldResponsibleUserId: staf.id,
        newResponsibleUserId: users[index % users.length].id,
        mutationDate: date(`2026-0${(index % 5) + 1}-1${index % 9}`),
        reason: "Penyesuaian kebutuhan operasional unit.",
        approvalStatus: status as Prisma.AssetMutationCreateInput["approvalStatus"],
        approvedById: status === "MENUNGGU" ? null : users[2].id,
        approvedAt: status === "MENUNGGU" ? null : date("2026-06-01"),
        notes: "Data mutasi seed.",
        createdById: admin.id
      }
    });
  }

  for (const [index, asset] of createdAssets.slice(0, 15).entries()) {
    await prisma.serviceRecord.create({
      data: {
        assetId: asset.id,
        type: "PREVENTIVE",
        status: "SELESAI",
        scheduledDate: date(`2026-${String((index % 6) + 1).padStart(2, "0")}-20`),
        completedDate: date(`2026-${String((index % 6) + 1).padStart(2, "0")}-22`),
        technicianName: ["Budi Santoso", "Rina Mahendra", "Fajar Pratama", "Dewi Kartika"][index % 4],
        notes: "Pemeliharaan preventif berkala berjalan sesuai prosedur standar operasional rumah sakit.",
        cost: new Prisma.Decimal(index % 4 === 0 ? 175000 : 50000),
        createdById: staf.id
      }
    });
  }

  const repairSpecs = [
    ["IT-PC-2026-002", "Boot lambat", 350000, "LAYAK_GANTI"],
    ["IT-PC-2026-002", "HDD bad sector", 450000, "LAYAK_GANTI"],
    ["IT-PC-2026-002", "RAM sering penuh", 275000, "LAYAK_GANTI"],
    ["IT-PC-2026-002", "Aplikasi sering hang", 200000, "LAYAK_GANTI"],
    ["IT-AP-2026-004", "Sinyal tidak stabil", 180000, "DALAM_PERBAIKAN"],
    ["IT-SCN-2026-007", "Hasil scan bergaris", 650000, "LAYAK_GANTI"],
    ["IT-UPS-2026-009", "Baterai menurun", 850000, "MAINTENANCE"],
    ["IT-PC-2026-015", "Kipas bising", 250000, "AKTIF"],
    ["IT-PC-2026-016", "OS tidak kompatibel", 400000, "LAYAK_GANTI"],
    ["IT-PRN-2026-017", "Paper jam", 150000, "DALAM_PERBAIKAN"],
    ["IT-AP-2026-018", "Sering restart", 220000, "MAINTENANCE"],
    ["IT-ANTRI-2026-023", "Touchscreen tidak responsif", 1200000, "LAYAK_GANTI"]
  ] as const;

  for (const [index, [assetCode, symptoms, cost, finalStatus]] of repairSpecs.entries()) {
    await prisma.serviceRecord.create({
      data: {
        assetId: assets[assetCode].id,
        type: "CORRECTIVE",
        status: finalStatus === "DALAM_PERBAIKAN" ? "SEDANG_DIKERJAKAN" : "SELESAI",
        scheduledDate: date(`2026-${String((index % 6) + 1).padStart(2, "0")}-0${(index % 8) + 1}`),
        completedDate: finalStatus === "DALAM_PERBAIKAN" ? null : date("2026-06-10"),
        symptoms: `${symptoms}. Gangguan operasional perangkat dilaporkan oleh unit.`,
        actionTaken: "Pemeriksaan komponen, pembersihan, dan penggantian jika diperlukan.",
        replacedComponents: index % 3 === 0 ? "RAM/HDD/Baterai" : null,
        cost: new Prisma.Decimal(cost),
        technicianName: ["Budi Santoso", "Rina Mahendra", "Fajar Pratama"][index % 3],
        createdById: staf.id
      }
    });
  }

  const aiRun = await prisma.aiAnalysisRun.create({
    data: {
      runCode: "AI-RUN-2026-001",
      year: 2027,
      totalAssets: 10,
      model: process.env.OPENMODEL_MODEL || "deepseek-v4-flash",
      summary: "Analisis berkala menunjukkan beberapa perangkat operasional kritis memerlukan tindakan segera berupa upgrade komponen utama atau rencana penggantian perangkat secara bertahap.",
      createdById: admin.id
    }
  });

  const aiTargetCodes = [
    "IT-PC-2026-002",
    "IT-AP-2026-004",
    "IT-SCN-2026-007",
    "IT-UPS-2026-009",
    "IT-PC-2026-015",
    "IT-PC-2026-016",
    "IT-PRN-2026-017",
    "IT-AP-2026-018",
    "IT-SRV-2026-019",
    "IT-ANTRI-2026-023"
  ];

  for (const [index, code] of aiTargetCodes.entries()) {
    const asset = assets[code];
    const score = [92, 47, 86, 55, 63, 96, 44, 58, 31, 100][index];
    const recommendationTypes =
      score >= 80
        ? ["REPLACE", "DECOMMISSION"]
        : score >= 60
          ? ["UPGRADE"]
          : [];
    await prisma.assetReplacementRecommendation.create({
      data: {
        assetId: asset.id,
        score,
        status: scoreStatus(score),
        recommendationTypes: recommendationTypes as Prisma.AssetReplacementRecommendationCreateInput["recommendationTypes"],
        reason: score >= 80 
          ? "Akumulasi skor kritis akibat usia perangkat di atas batas normal operasional, riwayat kerusakan berulang, dan ketidaksesuaian spesifikasi dengan standar kerja rumah sakit saat ini."
          : score >= 60
            ? "Spesifikasi perangkat (RAM/Penyimpanan) di bawah batas standar operasional kerja, direkomendasikan peningkatan untuk menjaga kinerja layanan."
            : "Kinerja perangkat dinilai masih aman untuk mendukung operasional layanan, direkomendasikan pemeliharaan preventif secara rutin.",
        source: "RULE_ENGINE_SYSTEM",
        year: 2027
      }
    });
    const rec = await prisma.aiAssetRecommendation.create({
      data: {
        runId: aiRun.id,
        assetId: asset.id,
        score,
        scoreStatus: scoreStatus(score),
        recommendationTypes: recommendationTypes as Prisma.AiAssetRecommendationCreateInput["recommendationTypes"],
        priority: score >= 80 ? "kritis" : score >= 60 ? "tinggi" : score >= 30 ? "sedang" : "rendah",
        summary: `Evaluasi prioritas ${asset.assetName} mendapatkan skor akumulasi risiko ${score} dari 100.`,
        recommendation: score >= 80 
          ? "Prioritaskan penggantian unit perangkat secara utuh demi kelancaran operasional layanan medis/administrasi." 
          : score >= 60 
            ? "Lakukan upgrade komponen hardware penunjang (RAM atau SSD) untuk memperpanjang usia pakai operasional." 
            : "Pertahankan pemeliharaan rutin preventif secara periodik.",
        reason: score >= 80 
          ? "Perangkat mendesak diganti karena akumulasi kerusakan perangkat keras, usia pakai melebihi 5 tahun, dan kinerja yang lambat untuk operasional klinis."
          : score >= 60 
            ? "Hardware memiliki kinerja memadai namun terhambat kapasitas penyimpanan dan memori yang tidak mencukupi standar aplikasi saat ini."
            : "Perangkat masih dalam kondisi layak pakai operasional normal, tidak ditemukan kendala teknis mayor dalam riwayat perbaikan terakhir.",
        nextYearPlan: score >= 80
          ? "Masukkan unit dalam daftar pengadaan barang baru Rencana Kerja dan Anggaran (RKA) IT rumah sakit."
          : score >= 60
            ? "Alokasikan biaya peningkatan (upgrade) hardware pada anggaran operasional IT triwulan mendatang."
            : "Lanjutkan pemantauan status berkala melalui modul pemeliharaan rutin.",
        openModelSucceeded: true,
        openModelErrorMessage: null
      }
    });
    await prisma.aiRecommendationDetail.createMany({
      data: [
        {
          aiAssetRecommendationId: rec.id,
          factor: "Umur dan spesifikasi",
          scoreImpact: Math.min(score, 30),
          message: "Perangkat dievaluasi berdasarkan usia pakai dan spesifikasi teknis."
        },
        {
          aiAssetRecommendationId: rec.id,
          factor: "Riwayat perbaikan",
          scoreImpact: Math.max(0, score - 50),
          message: "Frekuensi dan biaya perbaikan menjadi indikator risiko."
        }
      ]
    });
  }

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "INITIALIZE_DATABASE",
        module: "System",
        description: "Database sistem ASCIT diinisialisasi dengan konfigurasi dan basis data dasar."
      },
      {
        userId: admin.id,
        action: "CREATE_ASSET",
        module: "Data Aset IT",
        description: "Pemasukan massal 25 data inventaris aset IT berhasil diproses."
      },
      {
        userId: admin.id,
        action: "AI_ANALYSIS",
        module: "AI & Rekomendasi",
        description: "Sistem memproses evaluasi prioritas kelayakan 10 perangkat IT utama."
      }
    ]
  });

  console.log("ASCIT production database seeding completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
