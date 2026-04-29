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

// ---------- SCORING ----------
function scoreAccount(account) {
  let score = 50

  const priority = (account.priority || "").toUpperCase()
  const category = (account.category || "").toLowerCase()
  const notes = (account.notes || "").toLowerCase()
  const news = (account.news_summary || "").toLowerCase()
  const headline = (account.best_headline || "").toLowerCase()
  const combined = `${notes} ${news} ${headline}`

  if (priority === "A") score += 20
  if (priority === "B") score += 10

  if (category.includes("qsr")) score += 20
  if (category.includes("cpg")) score += 15
  if (category.includes("entertainment")) score += 15
  if (category.includes("retail")) score += 15
  if (category.includes("financial")) score += 10
  if (category.includes("public")) score += 10
  if (category.includes("health")) score += 10
  if (category.includes("auto")) score += 10

  if (combined.includes("launch")) score += 35
  if (combined.includes("campaign")) score += 35
  if (combined.includes("partnership")) score += 30
  if (combined.includes("sponsorship")) score += 30
  if (combined.includes("advertising")) score += 25
  if (combined.includes("media")) score += 20
  if (combined.includes("brand campaign")) score += 35
  if (combined.includes("new product")) score += 30
  if (combined.includes("product line")) score += 25
  if (combined.includes("limited time")) score += 25
  if (combined.includes("lto")) score += 25
  if (combined.includes("menu")) score += 20

  if (combined.includes("multicultural")) score += 35
  if (combined.includes("hispanic")) score += 35
  if (combined.includes("latino")) score += 35
  if (combined.includes("gen z")) score += 25
  if (combined.includes("growth audience")) score += 35
  if (combined.includes("culture")) score += 20
  if (combined.includes("cultural")) score += 20

  if (combined.includes("seasonal")) score += 15
  if (combined.includes("sports")) score += 25
  if (combined.includes("world cup")) score += 40

  if (combined.includes("contextual")) score += 20
  if (combined.includes("privacy")) score += 20
  if (combined.includes("cookieless")) score += 25
  if (combined.includes("third-party cookies")) score += 25

  if (!news && !headline) score -= 20

  return score
}

// ---------- NEWS FETCH ----------
async function fetchNewsForBrand(brand) {
  if (!process.env.NEWS_API_KEY) {
    return {
      headlines: [],
      best_headline: "",
      news_summary: "",
    }
  }

  const query = `"${brand}" AND (campaign OR marketing OR partnership OR sponsorship OR launch OR "new product" OR advertising OR media OR "brand campaign") NOT (coupon OR deal OR "weekly ad" OR discount OR ranking OR review OR recipe OR grocery)`

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    query
  )}&language=en&sortBy=publishedAt&pageSize=8&apiKey=${process.env.NEWS_API_KEY}`

  const response = await fetch(url)
  const data = await response.json()

  const articles = data.articles || []

  const headlines = articles
    .map((article) => ({
      title: article.title || "",
      source: article.source?.name || "",
      url: article.url || "",
      description: article.description || "",
      publishedAt: article.publishedAt || "",
    }))
    .filter((article) => article.title)

  const filtered = headlines.filter((h) =>
    /campaign|launch|partnership|sponsorship|advertising|media|brand|product/i.test(
      h.title
    ) &&
    !/coupon|deal|weekly ad|discount|ranking|review|recipe|grocery/i.test(
      h.title
    )
  )

  const usable = filtered.length > 0 ? filtered : headlines
  const best = usable[0] || null

  return {
    headlines: usable,
    best_headline: best ? best.title : "",
    news_summary: usable
      .slice(0, 3)
      .map((h) => `${h.title} (${h.source})`)
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
- Helps brands show up in culturally relevant, in-culture environments

Return ONLY valid JSON. No markdown. No code fences.

Fields:
why_now
subject_line
email_body
follow_up_email

Account:
Brand: ${account.brand}
Category: ${account.category}
Priority: ${account.priority}
Best Headline: ${account.best_headline}
News Summary: ${account.news_summary}
Mundial Fit Score: ${account.score}

Instructions:
- Use the headline/news only if it is truly relevant.
- If the news is weak or irrelevant, rely on category, timing, and Mundial Media fit.
- why_now should be 1-2 sentences.
- email_body should be a concise first-touch email from Josh at Mundial Media.
- Make it sharp, relevant, and sales-ready.
`

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  })

  const text = response.output_text || ""

  try {
    return JSON.parse(text)
  } catch {
    return {
      why_now: "Strong fit based on current account context and Mundial Media’s multicultural contextual targeting capabilities.",
      subject_line: `Quick idea for ${account.brand}`,
      email_body: `Hi — quick idea for ${account.brand} using privacy-safe contextual targeting to reach multicultural growth audiences. Worth a quick conversation?`,
      follow_up_email: `Following up here — happy to share a quick idea for how Mundial Media could support ${account.brand}.`,
    }
  }
}

// ---------- MAIN CRON ----------
export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing in Vercel." },
        { status: 500 }
      )
    }

    const filePath = path.join(process.cwd(), "public", "accounts.csv")
    const csv = fs.readFileSync(filePath, "utf8")

    const accounts = parseCSV(csv)
      .map((row) => ({
        brand: String(row.brand || "").trim(),
        category: String(row.category || "").trim(),
        priority: String(row.priority || "").trim(),
        notes: String(row.notes || "").trim(),
        recent_news: String(row["recent news"] || "").trim(),
      }))
      .filter((a) => a.brand)

    const enriched = []

    for (const account of accounts) {
      const news = await fetchNewsForBrand(account.brand)

      const fullAccount = {
        ...account,
        ...news,
      }

      enriched.push({
        ...fullAccount,
        score: scoreAccount(fullAccount),
      })
    }

    const top4 = enriched
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)

    const results = []

    for (const account of top4) {
      const pitch = await generateAIPitch(account)

      results.push({
        ...account,
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
      {
        error: "Cron failed",
        details: String(err?.message || err),
      },
      { status: 500 }
    )
  }
}
