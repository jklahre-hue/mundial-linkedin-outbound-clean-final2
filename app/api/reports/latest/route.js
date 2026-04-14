import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    weekly_pitches: [
      {
        brand: "Pizza Hut",
        category: "QSR",
        priority: "A",
        score: 100,
        why_now: "Pizza Hut is a strong fit for Mundial Media because its promotional cadence and broad growth-audience relevance create a timely contextual opportunity.",
        subject_line: "Quick idea for Pizza Hut",
        email_body: "Hi there, I wanted to reach out because Pizza Hut feels like a strong fit for Mundial Media’s contextual, privacy-safe audience strategy. Would love to share a quick idea if useful.",
      },
      {
        brand: "Chobani",
        category: "CPG",
        priority: "A",
        score: 95,
        why_now: "Chobani’s wellness relevance and growth-audience alignment make it a strong contextual fit for Mundial Media.",
        subject_line: "Quick idea for Chobani",
        email_body: "Hi there, Chobani feels like a very natural fit for Mundial Media’s contextual and multicultural audience strategy. Open to a quick intro?",
      }
    ]
  })
}
