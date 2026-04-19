import fs from "fs"
import path from "path"
import * as XLSX from "xlsx"
import { NextResponse } from "next/server"

function normalizeAccountRow(row) {
  return {
    brand: String(row.brand || "").trim(),
    category: String(row.category || "").trim(),
    priority: String(row.priority || "").trim(),
    notes: String(row.notes || "").trim(),
    recent_news: String(row["recent news"] || "").trim(),
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "accounts.csv")
    const fileBuffer = fs.readFileSync(filePath)

    const workbook = XLSX.read(fileBuffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })

    const parsed = json
      .map(normalizeAccountRow)
      .filter((row) => row.brand)

    return NextResponse.json({
      accounts: parsed,
    })
  } catch (error) {
    console.error("ACCOUNTS ROUTE ERROR:", error)

    return NextResponse.json(
      { error: "Could not load accounts." },
      { status: 500 }
    )
  }
}
