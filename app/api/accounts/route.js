import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

  return lines.slice(1).map((line) => {
    const values = line.split(",")
    const row = {}
    headers.forEach((header, i) => {
      row[header] = (values[i] || "").trim()
    })
    return row
  })
}

function normalizeAccountRow(row) {
  return {
    brand: String(row.brand || "").trim(),
    category: String(row.category || "").trim(),
    priority: String(row.priority || "").trim(),
    notes: String(row.notes || "").trim(),
    recent_news: String(row["recent news"] || row.recent_news || "").trim(),
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "accounts.csv")
    const csvText = fs.readFileSync(filePath, "utf8")
    const parsed = parseCsv(csvText).map(normalizeAccountRow).filter((row) => row.brand)

    return NextResponse.json({
      accounts: parsed,
    })
  } catch (error) {
    console.error("ACCOUNTS ROUTE ERROR:", error)
    return NextResponse.json(
      { error: "Could not load master accounts file." },
      { status: 500 }
    )
  }
}
