import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

function parseCSV(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase())

  return lines.slice(1).map(line => {
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

    const parsed = parseCSV(csv).filter(row => row.brand)

    return NextResponse.json({
      accounts: parsed,
      count: parsed.length
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load accounts",
        details: String(error?.message || error)
      },
      { status: 500 }
    )
  }
}
