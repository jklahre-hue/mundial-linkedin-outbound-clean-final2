import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "accounts.json")
    const raw = fs.readFileSync(filePath, "utf8")
    const accounts = JSON.parse(raw)

    const cleaned = accounts
      .map((row) => ({
        brand: String(row.brand || "").trim(),
        category: String(row.category || "").trim(),
        priority: String(row.priority || "").trim(),
        notes: String(row.notes || "").trim(),
        recent_news: String(row.recent_news || "").trim(),
      }))
      .filter((row) => row.brand)

    return NextResponse.json({
      accounts: cleaned,
      count: cleaned.length,
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
