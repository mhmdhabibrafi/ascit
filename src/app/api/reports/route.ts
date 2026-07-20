import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireSession, requestIp } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime, humanizeEnum, toCsv } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function buildExcelWorkbook({
  rows,
  columns,
  title,
  subtitle,
  columnWidths = {}
}: {
  rows: Array<Record<string, unknown>>;
  columns: Array<[string, string]>;
  title: string;
  subtitle?: string;
  columnWidths?: Record<string, number>;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ASCIT";
  workbook.created = new Date();
  const tableBorder = {
    top: { style: "thin", color: { argb: "FF94A3B8" } },
    left: { style: "thin", color: { argb: "FF94A3B8" } },
    bottom: { style: "thin", color: { argb: "FF94A3B8" } },
    right: { style: "thin", color: { argb: "FF94A3B8" } }
  } as const;
  const headerBorder = {
    top: { style: "thin", color: { argb: "FF075985" } },
    left: { style: "thin", color: { argb: "FF075985" } },
    bottom: { style: "thin", color: { argb: "FF075985" } },
    right: { style: "thin", color: { argb: "FF075985" } }
  } as const;

  const worksheet = workbook.addWorksheet("Data", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.2, footer: 0.2 }
    }
  });
  worksheet.properties.defaultRowHeight = 22;

  worksheet.mergeCells(1, 1, 1, columns.length);
  worksheet.mergeCells(2, 1, 2, columns.length);
  worksheet.getRow(1).height = 30;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 8;

  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 18, color: { argb: "FF075985" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
  titleCell.border = tableBorder;

  const subtitleCell = worksheet.getCell(2, 1);
  subtitleCell.value = subtitle || `Dicetak ${formatDateTime(new Date())}`;
  subtitleCell.font = { size: 10, color: { argb: "FF475569" } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  subtitleCell.border = tableBorder;

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(columns.map(([, label]) => label));
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F6FA8" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = headerBorder;
  });

  rows.forEach((row) => {
    worksheet.addRow(columns.map(([key]) => (key === "no" ? Number(row[key] || 0) : String(row[key] ?? "-") || "-")));
  });

  columns.forEach(([key], index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = columnWidths[key] || 18;
    if (key !== "no") column.numFmt = "@";
  });

  for (let rowNumber = 5; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.height = 24;
    for (let columnNumber = 1; columnNumber <= columns.length; columnNumber += 1) {
      const key = columns[columnNumber - 1]?.[0];
      const cell = row.getCell(columnNumber);
      cell.alignment = { horizontal: key === "no" ? "center" : "left", vertical: "middle", wrapText: true };
      cell.border = tableBorder;
      if (key !== "no") cell.numFmt = "@";
      if (rowNumber % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    }
  }

  worksheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: columns.length }
  };

  return workbook.xlsx.writeBuffer();
}

export async function GET(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "assets";
  const unitId = params.get("unitId") || undefined;
  const categoryId = params.get("categoryId") || undefined;
  const segmentId = params.get("segmentId") || undefined;
  const conditionStatus = params.get("conditionStatus") || undefined;
  const format = params.get("format") || "json";
  const isExport = format === "csv" || format === "excel" || format === "xlsx" || format === "xls";

  const assetWhere = {
    deletedAt: null,
    ...(unitId ? { unitId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(segmentId ? { segmentId } : {}),
    ...(conditionStatus ? { conditionStatus: conditionStatus as never } : {})
  };

  let rows: Array<Record<string, unknown>> = [];
  let columns: Array<[string, string]> = [];
  let excelColumnWidths: Record<string, number> = {};

  if (type === "maintenance") {
    const records = await prisma.serviceRecord.findMany({
      include: { asset: { include: { unit: true } } },
      orderBy: { createdAt: "desc" }
    });
    rows = records.map((item) => ({
      tanggal: formatDate(item.createdAt),
      kode: item.asset.assetCode,
      aset: item.asset.assetName,
      unit: item.asset.unit.name,
      teknisi: item.technicianName,
      hasil: item.actionTaken,
      biaya: formatCurrency(item.cost.toString())
    }));
    columns = [
      ["tanggal", "Tanggal"],
      ["kode", "Kode Aset"],
      ["aset", "Aset"],
      ["unit", "Unit"],
      ["teknisi", "Teknisi"],
      ["hasil", "Hasil"],
      ["biaya", "Biaya"]
    ];
  } else if (type === "mutations") {
    const records = await prisma.assetMutation.findMany({
      include: { asset: true, fromUnit: true, toUnit: true, fromRoom: true, toRoom: true },
      orderBy: { mutationDate: "desc" }
    });
    rows = records.map((item) => ({
      tanggal: formatDate(item.mutationDate),
      kode: item.asset.assetCode,
      aset: item.asset.assetName,
      dari: `${item.fromUnit.name} / ${item.fromRoom.name}`,
      tujuan: `${item.toUnit.name} / ${item.toRoom.name}`,
      status: humanizeEnum(item.approvalStatus),
      alasan: item.reason
    }));
    columns = [
      ["tanggal", "Tanggal"],
      ["kode", "Kode Aset"],
      ["aset", "Aset"],
      ["dari", "Dari"],
      ["tujuan", "Tujuan"],
      ["status", "Status"],
      ["alasan", "Alasan"]
    ];
  } else if (type === "ai") {
    const records = await prisma.aiAssetRecommendation.findMany({
      include: { asset: { include: { unit: true, category: true } }, run: true },
      orderBy: { score: "desc" },
      take: 200
    });
    rows = records.map((item) => ({
      kode: item.asset.assetCode,
      aset: item.asset.assetName,
      unit: item.asset.unit.name,
      kategori: item.asset.category.name,
      skor: item.score,
      status: humanizeEnum(item.scoreStatus),
      rekomendasi: item.recommendation,
      alasan: item.reason,
      tahun: item.run.year
    }));
    columns = [
      ["kode", "Kode Aset"],
      ["aset", "Aset"],
      ["unit", "Unit"],
      ["kategori", "Kategori"],
      ["skor", "Skor"],
      ["status", "Status"],
      ["rekomendasi", "Rekomendasi"],
      ["alasan", "Alasan"],
      ["tahun", "Tahun"]
    ];
  } else {
    const assets = await prisma.asset.findMany({
      where: assetWhere,
      include: {
        category: true,
        segment: true,
        brand: true,
        vendor: true,
        unit: true,
        room: true,
        responsibleUser: { select: { name: true, email: true } },
        aiRecommendations: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { assetCode: "asc" }
    });
    rows = assets.map((asset, index) => {
      const condition = humanizeEnum(asset.conditionStatus || "");
      const riskScore = asset.aiRecommendations?.[0]?.score ?? "-";
      
      let warrantyStr = "-";
      if (asset.warrantyEndDate) {
         const endDate = new Date(asset.warrantyEndDate);
         const isExpired = endDate < new Date();
         warrantyStr = isExpired ? "Habis" : "Aktif (" + formatDate(endDate) + ")";
      }

      return {
        no: index + 1,
        assetCode: asset.assetCode,
        namaBarang: asset.assetName,
        jenisBarang: asset.category.name,
        segment: asset.segment?.name || "-",
        brand: asset.brand?.name || "-",
        model: asset.model || "-",
        serialNumber: asset.serialNumber || "-",
        vendor: asset.vendor?.name || "-",
        unit: asset.unit.name,
        ruangan: asset.room.name,
        penanggungJawab: asset.responsibleUser?.name || "-",
        emailPenanggungJawab: asset.responsibleUser?.email || "-",
        ipAddress: asset.ipAddress || "-",
        macAddress: asset.macAddress || "-",
        operatingSystem: asset.operatingSystem || "-",
        processor: asset.processor || "-",
        ram: asset.ram || "-",
        storage: asset.storage || "-",
        tanggalPembelian: asset.purchaseDate ? formatDate(asset.purchaseDate) : "-",
        hargaPembelian: Number(asset.purchasePrice) > 0 ? formatCurrency(asset.purchasePrice.toString()) : "-",
        nomorInvoice: asset.invoiceNumber || "-",
        mulaiGaransi: asset.warrantyStartDate ? formatDate(asset.warrantyStartDate) : "-",
        akhirGaransi: asset.warrantyEndDate ? formatDate(asset.warrantyEndDate) : "-",
        statusGaransi: warrantyStr,
        kondisi: condition,
        lifecycle: humanizeEnum(asset.lifecycleStatus),
        skorRisiko: riskScore,
        catatan: asset.notes || "-",
        dibuat: formatDateTime(asset.createdAt),
        diperbarui: formatDateTime(asset.updatedAt)
      };
    });
    columns = [
      ["no", "No"],
      ["assetCode", "Kode Aset"],
      ["namaBarang", "Nama Aset"],
      ["jenisBarang", "Kategori"],
      ["segment", "Segmen"],
      ["brand", "Merek"],
      ["model", "Model"],
      ["serialNumber", "Serial Number"],
      ["vendor", "Vendor"],
      ["unit", "Unit"],
      ["ruangan", "Ruangan"],
      ["penanggungJawab", "Penanggung Jawab"],
      ["emailPenanggungJawab", "Email Penanggung Jawab"],
      ["ipAddress", "IP Address"],
      ["macAddress", "Mac Address"],
      ["operatingSystem", "Sistem Operasi"],
      ["processor", "Prosesor"],
      ["ram", "RAM"],
      ["storage", "Penyimpanan"],
      ["tanggalPembelian", "Tanggal Pembelian"],
      ["hargaPembelian", "Harga Pembelian"],
      ["nomorInvoice", "Nomor Invoice"],
      ["mulaiGaransi", "Mulai Garansi"],
      ["akhirGaransi", "Akhir Garansi"],
      ["statusGaransi", "Status Garansi"],
      ["kondisi", "Kondisi"],
      ["lifecycle", "Status Lifecycle"],
      ["skorRisiko", "Skor Risiko"],
      ["catatan", "Catatan"],
      ["dibuat", "Dibuat"],
      ["diperbarui", "Diperbarui"]
    ];
    excelColumnWidths = {
      no: 6,
      assetCode: 18,
      namaBarang: 30,
      jenisBarang: 20,
      segment: 18,
      brand: 18,
      model: 20,
      serialNumber: 20,
      vendor: 24,
      unit: 22,
      ruangan: 22,
      penanggungJawab: 24,
      emailPenanggungJawab: 28,
      ipAddress: 16,
      macAddress: 20,
      operatingSystem: 22,
      processor: 24,
      ram: 14,
      storage: 18,
      tanggalPembelian: 18,
      hargaPembelian: 20,
      nomorInvoice: 20,
      mulaiGaransi: 18,
      akhirGaransi: 18,
      kondisi: 16,
      lifecycle: 20,
      skorRisiko: 8,
      statusGaransi: 24,
      catatan: 36,
      dibuat: 22,
      diperbarui: 22
    };
  }

  await createAuditLog({
    session,
    action: isExport ? "EXPORT_REPORT" : "VIEW_REPORT",
    module: "Laporan",
    description: `Laporan ${type} ${isExport ? "diekspor" : "dibuka"}.`,
    ipAddress: requestIp(request)
  });

  if (format === "excel" || format === "xlsx" || format === "xls") {
    const buffer = await buildExcelWorkbook({
        rows,
        columns,
        title: type === "assets" ? "Data Aset IT" : `Laporan ${humanizeEnum(type)}`,
        subtitle: type === "assets" ? `Data lengkap inventaris aset IT. Dicetak ${formatDateTime(new Date())}.` : undefined,
        columnWidths: excelColumnWidths
    });
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="ascit-${type}.xlsx"`
      }
    });
  }

  if (format === "csv") {
    return new NextResponse(toCsv(rows, columns), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ascit-${type}.csv"`
      }
    });
  }

  return NextResponse.json({ rows, columns });
}
