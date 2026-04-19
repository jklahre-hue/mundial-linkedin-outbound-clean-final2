import fs from "fs"
import path from "path"
import * as XLSX from "xlsx"
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
    const filePath = path.join(process.cwd(), "data", "accounts.xlsx")

    const fileBuffer = fs.readFileSync(filePath)

    const workbook = XLSX.read(fileBuffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    const json = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    })

    const parsed = json
      .map(normalizeAccountRow)
      .filter((row) => row.brand)

    return NextResponse.json({
      accounts: parsed,
      count: parsed.length,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Failed to load accounts" },
      { status: 500 }
    )
  }
}
