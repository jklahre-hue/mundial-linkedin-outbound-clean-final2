import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

function normalizeAccountRow(row) {
  return {
    brand: String(row.brand || row.Brand || "").trim(),
    category: String(row.category || row.Category || "").trim(),
    priority: String(row.priority || row.Priority || "").trim(),
    notes: String(row.notes || row.Notes || "").trim(),
    recent_news: String(
      row["recent news"] ||
      row["Recent News"] ||
      ""
    ).trim(),
  }
}

export async function GET() {
  try {
    const xlsxModule = await import("xlsx")
    const XLSX = xlsxModule.default || xlsxModule

    const filePath = path.join(process.cwd(), "data", "accounts.xlsx")

    const exists = fs.existsSync(filePath)
    if (!exists) {
      return NextResponse.json(
        {
          error: "accounts.xlsx not found",
          filePath,
        },
        { status: 500 }
      )
    }

    const fileBuffer = fs.readFileSync(filePath)

    const workbook = XLSX.read(fileBuffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })

    const parsed = json
      .map(normalizeAccountRow)
      .filter((row) => row.brand)

    return NextResponse.json({
      accounts: parsed,
      count: parsed.length,
      sheetName,
      firstRow: json[0] || null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load accounts",
        details: String(error?.message || error),
      },
      { status: 500 }
    )
  }
}
