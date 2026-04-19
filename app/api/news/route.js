import { NextResponse } from "next/server"

export async function POST(req) {
  try {
    const { brand } = await req.json()

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      brand
    )}&sortBy=publishedAt&pageSize=3&apiKey=${process.env.NEWS_API_KEY}`

    const res = await fetch(url)
    const data = await res.json()

    const headlines = (data.articles || []).map(
      (a) => `${a.title}`
    )

    return NextResponse.json({
      headlines
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "News fetch failed" },
      { status: 500 }
    )
  }
}
