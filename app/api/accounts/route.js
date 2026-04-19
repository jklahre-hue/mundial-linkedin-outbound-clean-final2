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

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "accounts.csv")
    const csvText = fs.readFileSync(filePath, "utf8")

    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const headerLine = lines[0] || ""
    const firstDataLine = lines[1] || ""

    const headers = parseCsvLine(headerLine)
    const firstRow = parseCsvLine(firstDataLine)

    return NextResponse.json({
      filePath,
      lineCount: lines.length,
      headerLine,
      firstDataLine,
      headers,
      firstRow,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not read accounts file.",
        details: String(error?.message || error),
      },
      { status: 500 }
    )
  }
}
