import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

function cleanHeader(header) {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
}

function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const headers = lines[0].split(",").map(cleanHeader)

  return lines.slice(1).map((line) => {
    const values = line.split(",")
    const row = {}

    headers.forEach((header, i) => {
      row[header] = (values[i] || "").trim()
    })

    return row
  })
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "accounts.csv")
    const csv = fs.readFileSync(filePath, "utf8")

    const parsed = parseCSV(csv)
      .map((row) => ({
        brand: String(row.brand || "").trim(),
        category: String(row.category || "").trim(),
        priority: String(row.priority || "").trim(),
        notes: String(row.notes || "").trim(),
        recent_news: String(row["recent news"] || "").trim(),
      }))
      .filter((row) => row.brand)

    return NextResponse.json({
      accounts: parsed,
      count: parsed.length,
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
