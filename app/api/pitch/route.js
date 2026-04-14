import OpenAI from "openai"
import { NextResponse } from "next/server"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req) {
  try {
    const { brand, category, priority, notes } = await req.json()

    const prompt = `
You are writing outbound sales messaging for Mundial Media.

Return valid JSON with exactly these keys:
why_now
subject_line
email_body

Brand: ${brand}
Category: ${category}
Priority: ${priority}
Notes: ${notes}

Instructions:
- why_now should be 1-2 sentences
- subject_line should be concise
- email_body should be a short outreach email
- tone should be professional, sharp, and relevant
`

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: prompt,
    })

    const text = response.output_text || ""

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = {
        why_now: "Potential fit for Mundial Media based on the uploaded account context.",
        subject_line: `Quick idea for ${brand}`,
        email_body: text || `Hi there, I wanted to reach out because ${brand} looks like a strong fit for Mundial Media.`,
      }
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Pitch generation failed." },
      { status: 500 }
    )
  }
}
