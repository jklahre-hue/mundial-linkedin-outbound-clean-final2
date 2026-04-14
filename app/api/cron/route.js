import OpenAI from "openai"
import { NextResponse } from "next/server"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const sampleAccounts = [
  {
    brand: "Pizza Hut",
    category: "QSR",
    priority: "A",
    notes: "Strong QSR fit and promotional cadence.",
    recent_news: "Seasonal promotions and menu visibility create a timely outreach moment.",
  },
  {
    brand: "Chobani",
    category: "CPG",
    priority: "A",
    notes: "Wellness relevance and strong growth audience alignment.",
    recent_news: "Recent brand activity around wellness and everyday consumption creates a timely reason to connect.",
  },
  {
    brand: "Hulu",
    category: "Publicis",
    priority: "B",
    notes: "Potential streaming and audience growth relevance.",
    recent_news: "Streaming competition and audience positioning make contextual differentiation more relevant.",
  },
  {
    brand: "The Home Depot",
    category: "Retail",
    priority: "A",
    notes: "Seasonal shopping and strong contextual retail fit.",
    recent_news: "Spring and seasonal shopping moments create a timely retail activation angle.",
  },
]

function scoreAccount(account) {
  let score = 50

  const priority = (account.priority || "").toUpperCase()
  const category = (account.category || "").toLowerCase()
  const notes = (account.notes || "").toLowerCase()

  if (priority === "A") score += 20
  if (priority === "B") score += 10

  if (["qsr", "retail", "cpg", "automotive"].includes(category)) score += 15

  if (
    notes.includes("promotion") ||
    notes.includes("promotional") ||
    notes.includes("lto") ||
    notes.includes("launch")
  ) {
    score += 15
  }

  if (
    notes.includes("multicultural") ||
    notes.includes("growth audience") ||
    notes.includes("growth audiences")
  ) {
    score += 15
  }

  return score
}

async function generatePitch(account) {
  const prompt = `
You are writing outbound sales messaging for Mundial Media.

Mundial Media value proposition:
- reaches multicultural and growth audiences
- uses privacy-safe contextual targeting
- helps brands show up in culturally relevant environments
- aligns the right audience, right content, and right ad

Return valid JSON with exactly these keys:
why_now
subject_line
email_body

Brand: ${account.brand}
Category: ${account.category}
Priority: ${account.priority}
Notes: ${account.notes}
Recent News: ${account.recent_news}

Instructions:
- why_now should explain why this account is a fit for Mundial Media specifically
- subject_line should be concise and sales-ready
- email_body should be a short outreach email
- return JSON only
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
      why_now: "Strong fit for Mundial Media based on current category and brand context.",
      subject_line: `Quick idea for ${account.brand}`,
      email_body: text || `Hi, I wanted to reach out because ${account.brand} looks like a strong fit for Mundial Media.`,
    }
  }
}

export async function GET() {
  try {
    const ranked = sampleAccounts
      .map((account) => ({
        ...account,
        score: scoreAccount(account),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)

    const results = []

    for (const account of ranked) {
      const pitch = await generatePitch(account)
      results.push({
        ...account,
        ...pitch,
      })
    }

    return NextResponse.json({
      success: true,
      generated_at: new Date().toISOString(),
      weekly_pitches: results,
    })
  } catch (error) {
    console.error("CRON ERROR:", error)
    return NextResponse.json(
      { error: error?.message || "Weekly cron failed." },
      { status: 500 }
    )
  }
}
