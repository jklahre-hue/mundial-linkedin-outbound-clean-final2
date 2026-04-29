import fs from "fs"
import path from "path"
import OpenAI from "openai"
import { NextResponse } from "next/server"

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

function scoreAccount(account) {
  let score = 50

  const priority = (account.priority || "").toUpperCase()
  const category = (account.category || "").toLowerCase()
  const notes = (account.notes || "").toLowerCase()
  const news = (account.news_summary || "").toLowerCase()
  const combined = `${notes} ${news}`

  if (priority === "A") score += 20
  if (priority === "B") score += 10

  if (category.includes("qsr")) score += 20
  if (category.includes("cpg")) score += 15
  if (category.includes("retail")) score += 15
  if (category.includes("entertainment")) score += 15
  if (category.includes("financial")) score += 10
  if (category.includes("public")) score += 10
  if (category.includes("health")) score += 10
  if (category.includes("auto")) score += 10

  if (combined.includes("launch")) score += 20
  if (combined.includes("campaign")) score += 20
  if (combined.includes("partnership")) score += 15
  if (combined.includes("promotion")) score += 15
  if (combined.includes("lto")) score += 15
  if (combined.includes("seasonal")) score += 10
  if (combined.includes("sports")) score += 10
  if (combined.includes("streaming")) score += 10
  if (combined.includes("multicultural")) score += 20
  if (combined.includes("hispanic")) score += 20
  if (combined.includes("gen z")) score += 15
  if (combined.includes("growth audience")) score += 15
  if (combined.includes("contextual")) score += 10
  if (combined.includes("privacy")) score += 10

  return score
}

async function fetchNewsForBrand(brand) {
  if (!process.env.NEWS_API_KEY) {
    return {
      headlines: [],
      best_headline: "",
      news_summary: "",
    }
  }

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    `"${brand}"`
  )}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`

  const response = await fetch(url)
  const data = await response.json()

  const articles = data.articles || []

  const headlines = articles
    .map((article) => ({
      title: article.title || "",
      source: article.source?.name || "",
      url: article.url || "",
      publishedAt: article.publishedAt || "",
      description: article.description || "",
    }))
    .filter((article) => article.title)

  const best = headlines[0] || null

  return {
    headlines,
    best_headline: best ? best.title : "",
    news_summary: headlines
      .slice(0, 3)
      .map((h) => `${h.title} (${h.source})`)
      .join(" | "),
  }
}

async function generateAIPitch(account) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const prompt = `
You are writing outbound sales messaging for Mundial Media.

Mundial Media value proposition:
- Reaches multicultural and growth audiences
- Uses privacy-safe contextual targeting
- Helps brands show up in culturally relevant, in-culture environments
- Aligns the right audience, right content, and right ad
- Helps marketers future-proof media without relying on third-party cookies

Return ONLY raw valid JSON. Do not wrap it in markdown. Do not use \`\`\`json. Do not include any explanation.

Return exactly these keys:
why_now
subject_line
email_body
follow_up_email

Account:
Brand: ${account.brand}
Category: ${account.category}
Priority: ${account.priority}
Notes: ${account.notes}
Best Recent Headline: ${account.best_headline}
Recent News Summary: ${account.news_summary}
Mundial Fit Score: ${account.score}

Instructions:
- why_now should be 1-2 sentences explaining why this account is timely for Mundial Media.
- Reference the recent headline/news if it is relevant.
- subject_line should be short and sales-ready.
- email_body should be a concise first-touch sales email from Josh at Mundial Media.
- follow_up_email should be a short follow-up.
- Keep the tone professional, sharp, and relevant.
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
      why_now:
        "This account appears to be a strong fit for Mundial Media based on category, priority, and current market context.",
      subject_line: `Quick idea for ${account.brand}`,
      email_body:
        text ||
        `Hi there — I wanted to reach out because ${account.brand} looks like a strong fit for Mundial Media’s contextual and growth-audience capabilities. Open to a quick conversation?`,
      follow_up_email: `Hi there — quick follow-up on my note about Mundial Media and ${account.brand}. Happy to share a short idea if useful.`,
    }
  }
}

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

    const baseAccounts = parseCSV(csv)
      .map((row) => ({
        brand: String(row.brand || "").trim(),
        category: String(row.category || "").trim(),
        priority: String(row.priority || "").trim(),
        notes: String(row.notes || "").trim(),
        recent_news: String(row["recent news"] || "").trim(),
      }))
      .filter((row) => row.brand)

    const enrichedAccounts = []

    for (const account of baseAccounts) {
      const news = await fetchNewsForBrand(account.brand)

      const enriched = {
        ...account,
        headlines: news.headlines,
        best_headline: news.best_headline || account.recent_news || "",
        news_summary: news.news_summary || account.recent_news || "",
      }

      enrichedAccounts.push({
        ...enriched,
        score: scoreAccount(enriched),
      })
    }

    const top4 = enrichedAccounts
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
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cron workflow failed.",
        details: String(error?.message || error),
      },
      { status: 500 }
    )
  }
}
