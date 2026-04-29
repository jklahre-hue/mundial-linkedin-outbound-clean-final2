import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

// --- CSV PARSER ---
function cleanHeader(header) {
  return String(header || "")
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

// --- SCORING LOGIC ---
function scoreAccount(row) {
  let score = 0

  const category = (row.category || "").toLowerCase()
  const notes = (row.notes || "").toLowerCase()

  if (category.includes("qsr")) score += 30
  if (category.includes("streaming")) score += 25
  if (category.includes("cpg")) score += 20
  if (category.includes("finance")) score += 15

  if (notes.includes("promotion")) score += 20
  if (notes.includes("growth")) score += 15
  if (notes.includes("audience")) score += 15

  return score
}

// --- SIMPLE PITCH (no OpenAI yet) ---
function generatePitch(account) {
  return {
    subject: `Reaching growth audiences for ${account.brand}`,
    body: `Hi there —\n\nNoticed ${account.brand} has strong alignment with multicultural growth audiences, especially given current activity in ${account.category}.\n\nMundial Media helps brands like yours reach these audiences through privacy-safe contextual targeting, driving measurable engagement without relying on third-party cookies.\n\nWorth a quick conversation?\n\nBest,\nJosh`
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "accounts.csv")
    const csv = fs.readFileSync(filePath, "utf8")

    const accounts = parseCSV(csv).map((row) => ({
      brand: row.brand,
      category: row.category,
      priority: row.priority,
      notes: row.notes,
      recent_news: row["recent news"],
      score: scoreAccount(row),
    }))

    const top4 = accounts
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((acct) => ({
        ...acct,
        pitch: generatePitch(acct),
      }))

    console.log("🔥 Weekly Top 4:", top4)

    return NextResponse.json({
      success: true,
      ran_at: new Date().toISOString(),
      top4,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cron failed",
        details: String(error?.message || error),
      },
      { status: 500 }
    )
  }
}
