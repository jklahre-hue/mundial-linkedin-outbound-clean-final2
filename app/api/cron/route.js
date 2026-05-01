import fs from "fs"
import path from "path"
import OpenAI from "openai"
import { NextResponse } from "next/server"

function cleanHeader(header) {
  return String(header || "").replace(/^\uFEFF/, "").trim().toLowerCase()
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
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
  let score = 0

  const priority = (account.priority || "").toUpperCase()
  const category = (account.category || "").toUpperCase()

  if (priority === "A") score += 30
  if (priority === "B") score += 15
  if (["QSR", "CPG"].includes(category)) score += 20
  if (account.notes) score += 10
  if ((account.headlines || []).length > 0) score += 60
  if (account.best_headline) score += 40

  return score
}

async function fetchNewsForBrand(brand) {
  if (!process.env.NEWS_API_KEY) {
    return { headlines: [], best_headline: "", news_summary: "" }
  }

  try {
    const query = `${brand} OR ${brand} brand OR ${brand} marketing OR ${brand} launch`

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      query
    )}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`

    const res = await fetch(url)
    const data = await res.json()

    const headlines = (data.articles || [])
      .map((a) => ({
        title: a.title || "",
        source: a.source?.name || "",
        url: a.url || "",
        description: a.description || "",
      }))
      .filter((a) => a.title)
      .filter(
        (a) =>
          !/coupon|promo code|weekly ad|discount/i.test(
            `${a.title} ${a.description}`
          )
      )

    const best = headlines[0] || null

    return {
      headlines,
      best_headline: best ? best.title : "",
      news_summary: headlines
        .slice(0, 3)
        .map((h) => `${h.title} (${h.source})`)
        .join(" | "),
    }
  } catch {
    return { headlines: [], best_headline: "", news_summary: "" }
  }
}

async function generatePitch(account) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      why_now: "OpenAI key missing.",
      subject_line: `Quick idea for ${account.brand}`,
      email_body: "",
      follow_up_email: "",
    }
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const prompt = `
Write a concise outbound sales email for Mundial Media.

Mundial Media:
- reaches multicultural growth audiences
- uses privacy-safe contextual targeting
- aligns audience, content, and ad
- helps brands future-proof media beyond cookies

Return ONLY valid JSON with:
why_now
subject_line
email_body
follow_up_email

Brand: ${account.brand}
Category: ${account.category}
News: ${account.best_headline || account.news_summary || "No major news"}
`

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    })

    let text = response.choices[0].message.content || ""
    text = text.replace(/```json|```/g, "").trim()

    return JSON.parse(text)
  } catch {
    return {
      why_now: `${account.brand} is a strong fit for Mundial Media based on category, audience relevance, and contextual alignment.`,
      subject_line: `Quick idea for ${account.brand}`,
      email_body: `Hi — quick idea for ${account.brand}: Mundial Media can help reach multicultural growth audiences through privacy-safe contextual targeting. Worth a quick conversation?`,
      follow_up_email: `Following up here — happy to share a quick idea for ${account.brand}.`,
    }
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "accounts.csv")
    const csvText = fs.readFileSync(filePath, "utf8")

    const accounts = parseCSV(csvText)
      .map((row) => ({
        brand: row.brand || "",
        category: row.category || "",
        priority: row.priority || "",
        notes: row.notes || "",
        recent_news: row["recent news"] || "",
      }))
      .filter((account) => account.brand)

    const enriched = await Promise.all(
      accounts.map(async (account) => {
        const news = await fetchNewsForBrand(account.brand)
        const fullAccount = { ...account, ...news }
        return { ...fullAccount, score: scoreAccount(fullAccount) }
      })
    )

    const topCandidates = enriched
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    const shuffled = [...topCandidates].sort(() => Math.random() - 0.5)
    const top4 = shuffled.slice(0, 4)

    const results = []

    for (const account of top4) {
      const pitch = await generatePitch(account)
      results.push({ ...account, ...pitch })
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
        error: "Cron failed",
        details: String(error?.message || error),
      },
      { status: 500 }
    )
  }
}
