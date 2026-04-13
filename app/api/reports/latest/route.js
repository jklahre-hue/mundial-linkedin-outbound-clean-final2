import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    brands: [
      {
        id: "1",
        brand_name: "Pizza Hut",
        why_now: "Strong QSR fit with relevant digital media and marketing leads.",
        contacts: [
          {
            full_name: "Sofia Martinez",
            title: "Director, Digital Media",
            email: "sofia@example.com",
            personalized_subject: "Quick idea for Pizza Hut",
            personalized_email: "Hi Sofia, I wanted to reach out because your role in digital media at Pizza Hut feels highly relevant to what we do at Mundial Media. Would love to share a quick idea if useful."
          },
          {
            full_name: "Jordan Ellis",
            title: "VP, Digital Marketing",
            email: "jordan@example.com",
            personalized_subject: "Quick idea for Pizza Hut",
            personalized_email: "Hi Jordan, your role in digital marketing at Pizza Hut stood out to me as highly relevant to Mundial Media. Open to a quick intro?"
          }
        ]
      }
    ]
  })
}
