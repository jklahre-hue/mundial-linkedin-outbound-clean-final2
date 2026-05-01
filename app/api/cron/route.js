import { NextResponse } from "next/server"

// -------------------------
// SCORE FUNCTION
// -------------------------
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

// -------------------------
// NEWS FETCH
// -------------------------
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

    const articles = data.articles || []

    const headlines = articles
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
  } catch (err) {
    return { headlines: [], best_headline: "", news_summary: "" }
  }
}

// -------------------------
// MAIN CRON
// -------------------------
export async function GET() {
  try {
    const file = await fetch(
      `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""}/data/accounts.csv`
    )

    const csvText = await file.text()

    const rows = csvText.split("\n").slice(1)

    const accounts = rows
      .map((row) => {
        const [brand, category, priority, notes, recent_news] =
          row.split(",")

        if (!brand) return null

        return {
          brand: brand.trim(),
          category: category?.trim(),
          priority: priority?.trim(),
          notes: notes?.trim(),
          recent_news: recent_news?.trim(),
        }
      })
      .filter(Boolean)

    // -------------------------
    // ENRICH WITH NEWS
    // -------------------------
    const enriched = await Promise.all(
      accounts.map(async (account) => {
        const news = await fetchNewsForBrand(account.brand)

        const combined = {
          ...account,
          ...news,
        }

        return {
          ...combined,
          score: scoreAccount(combined),
        }
      })
    )

    // -------------------------
    // RANDOMIZED TOP 4
    // -------------------------
    const sorted = enriched.sort((a, b) => b.score - a.score)

    const topCandidates = sorted.slice(0, 20)

    const shuffled = [...topCandidates].sort(() => Math.random() - 0.5)

    const top4 = shuffled.slice(0, 4)

    // -------------------------
    // RETURN
    // -------------------------
    return NextResponse.json({
      success: true,
      ran_at: new Date().toISOString(),
      count: top4.length,
      top4,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cron failed",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
