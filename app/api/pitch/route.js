import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(req) {
  try {
    // 🔒 Ensure API key exists BEFORE using OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      )
    }

    const body = await req.json()

    const {
      brand,
      category,
      notes,
      best_headline,
      news_summary,
    } = body

    // ✅ Create client ONLY after key check
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const prompt = `
You are a media sales strategist at Mundial Media.

Write a sharp, concise outbound email using:

Brand: ${brand}
Category: ${category}
Notes: ${notes || "N/A"}
Recent News: ${best_headline || news_summary || "No major news"}

Output JSON with:
- subject_line
- email_body
- follow_up_email

Keep it:
- Tight
- Insightful
- Specific
- Not generic
`

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    })

    let text = response.choices[0].message.content

    // 🧹 Clean formatting if wrapped in ```json
    text = text.replace(/```json|```/g, "").trim()

    const parsed = JSON.parse(text)

    return NextResponse.json(parsed)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Pitch generation failed",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
