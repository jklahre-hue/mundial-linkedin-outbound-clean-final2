import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(req) {
  try {
    // ✅ ONLY check env at runtime
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing in Vercel." },
        { status: 500 }
      )
    }

    const body = await req.json()

    const { brand, category, notes, best_headline, news_summary } = body

    // ✅ Create client INSIDE function
    const client = new OpenAI({ apiKey })

    const prompt = `
Write a sharp outbound email for a media sales pitch.

Brand: ${brand}
Category: ${category}
Notes: ${notes || "N/A"}
Recent News: ${best_headline || news_summary || "No recent news"}

Return JSON with:
- subject_line
- email_body
- follow_up_email

Make it:
- concise
- relevant
- not generic
`

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    })

    let text = response.choices[0].message.content
    text = text.replace(/```json|```/g, "").trim()

    const parsed = JSON.parse(text)

    return NextResponse.json(parsed)

  } catch (err) {
    return NextResponse.json(
      {
        error: "Pitch generation failed",
        details: err.message,
      },
      { status: 500 }
    )
  }
}
