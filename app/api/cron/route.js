import fs from "fs"
import path from "path"
import OpenAI from "openai"
import { NextResponse } from "next/server"

// ---------- CSV PARSER ----------
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

// ---------- SMART SCORING ----------
function scoreAccount(account) {
  let score = 50

  const priority = (account.priority || "").toUpperCase()
  const category = (account.category || "").toLowerCase()
  const notes = (account.notes || "").toLowerCase()
  const news = (account.news_summary || "").toLowerCase()
  const headline = (account.best_headline || "").toLowerCase()

  const combined = `${notes} ${news} ${headline}`

  // Priority
  if (priority === "A") score += 20
  if (priority === "B") score += 10

  // Category
  if (category.includes("qsr")) score += 20
  if (category.includes("cpg")) score += 15
  if (category.includes("entertainment")) score += 15
  if (category.includes("retail")) score += 15

  // 🔥 NEWS = HEAVY WEIGHT
  if (combined.includes("launch")) score += 35
  if (combined.includes("campaign")) score += 35
  if (combined.includes("partnership")) score += 30
  if (combined.includes("promotion")) score += 30
  if (combined.includes("menu")) score += 25
  if (combined.includes("product")) score += 25
  if (combined.includes("limited time")) score += 35
  if (combined.includes("lto")) score += 35

  // Marketing signals
  if (combined.includes("advertising")) score += 25
  if (combined.includes("media")) score += 20
  if (combined.includes("sponsorship")) score += 25

  // Mundial fit
  if (combined.includes("multicultural")) score += 35
  if (combined.includes("hispanic")) score += 35
  if (combined.includes("latino")) score += 35
  if (combined.includes("gen z")) score += 25
  if (combined.includes("growth")) score += 25

  // Timing
  if (combined.includes("seasonal")) score += 25
  if (combined.includes("sports")) score += 25
  if (combined.includes("world cup")) score += 40

  // Penalize no news
  if (!news && !headline) score -= 20

  return score
}

// ---------- NEWS FETCH ----------
async function fetchNewsForBrand(brand) {
  if (!process.env.NEWS_API_KEY) {
    return { headlines: [], best_headline: "", news_summary: "" }
  }

  const query = `"${brand}" AND (campaign OR marketing OR launch OR partnership OR promotion OR menu OR product OR advertising OR media OR audience OR multicultural OR Hispanic OR sports OR seasonal OR streaming OR brand)`

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    query
  )}&language=en&sortBy=publishedAt&pageSize=6&apiKey=${process.env.NEWS_API_KEY}`

  const res = await fetch(url)
  const data = await res.json()

  const articles = data.articles || []

  const headlines = articles.map((a) => ({
    title: a.title,
    source: a.source?.name,
    url: a.url,
    description: a.description,
  }))

  // Filter for relevant headlines
  const filtered = headlines.filter((h) =>
    /campaign|launch|promotion|partnership|menu|product|advertising|media|audience|brand/i.test(
      h.title
    )
  )

  const best = filtered[0] || headlines[0] || null

  return {
    headlines,
    best_headline: best ? best.title : "",
    news_summary: headlines
      .slice(0, 3)
      .map((h) => h.title)
      .join(" | "),
  }
}

// ---------- AI PITCH ----------
async function generateAIPitch(account) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const prompt = `
You are writing outbound sales emails for Mundial Media.

Mundial Media:
- Reaches multicultural growth audiences
- Uses privacy-safe contextual targeting
- Aligns audience + content + ad
- Future-proofs media beyond cookies

Return ONLY valid JSON. No markdown.

Fields:
why_now
subject_line
email_body
follow_up_email

Account:
Brand: ${account.brand}
Category: ${account.category}
Priority: ${account.priority}
Headline: ${account.best_headline}
News: ${account.news_summary}

Make it sharp, relevant, and sales-ready.
`

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  })

  try {
    return JSON.parse(response.output_text)
  } catch {
    return {
      why_now: "Strong fit based on current activity.",
      subject_line: `Quick idea for ${account.brand}`,
      email_body: `Hi — quick idea for ${account.brand} using contextual + multicultural targeting.`,
      follow_up_email: `Following up — worth a quick chat?`,
    }
  }
}

// ---------- MAIN CRON ----------
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "accounts.csv")
    const csv = fs.readFileSync(filePath, "utf8")

    const accounts = parseCSV(csv)
      .map((row) => ({
        brand: row.brand,
        category: row.category,
        priority: row.priority,
        notes: row.notes,
        recent_news: row["recent news"],
      }))
      .filter((a) => a.brand)

    const enriched = []

    for (const acc of accounts) {
      const news = await fetchNewsForBrand(acc.brand)

      const full = {
        ...acc,
        ...news,
      }

      enriched.push({
        ...full,
        score: scoreAccount(full),
      })
    }

    const top4 = enriched
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)

    const results = []

    for (const acc of top4) {
      const pitch = await generateAIPitch(acc)

      results.push({
        ...acc,
        ...pitch,
      })
    }

    return NextResponse.json({
      success: true,
      ran_at: new Date().toISOString(),
      count: results.length,
      top4: results,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Cron failed", details: err.message },
      { status: 500 }
    )
  }
}
