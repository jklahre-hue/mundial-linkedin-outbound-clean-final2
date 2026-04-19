import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

function parseCsvLine(line) {
  const result = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const headers = parseCsvLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, " ")
  )

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = {}

    headers.forEach((header, i) => {
      row[header] = (values[i] || "").trim()
    })

    return row
  })
}

function normalizeAccountRow(row) {
  return {
    brand: String(
      row.brand ||
      row["brand name"] ||
      row.company ||
      row.advertiser ||
      row["account name"] ||
      ""
    ).trim(),
    category: String(
      row.category ||
      row.vertical ||
      row.industry ||
      ""
    ).trim(),
    priority: String(
      row.priority ||
      row["priority tier"] ||
      row.tier ||
      ""
    ).trim(),
    notes: String(
      row.notes ||
      row.comments ||
      row.comment ||
      row["sales notes"] ||
      ""
    ).trim(),
    recent_news: String(
      row["recent news"] ||
      row["latest news"] ||
      row.news ||
      row.headline ||
      ""
    ).trim(),
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "accounts.csv")
    const csvText = fs.readFileSync(filePath, "utf8")

    const parsed = parseCsv(csvText)
      .map(normalizeAccountRow)
      .filter((row) => row.brand)

    return NextResponse.json({
      accounts: parsed,
      count: parsed.length,
    })
  } catch (error) {
    console.error("ACCOUNTS ROUTE ERROR:", error)

    return NextResponse.json(
      {
        error: "Could not load accounts.",
        details: String(error?.message || error),
      },
      { status: 500 }
    )
  }
}
