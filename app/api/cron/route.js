import { NextResponse } from "next/server"

export async function GET() {
  console.log("Weekly cron job ran")

  // For now, just return success
  // Later this will:
  // - refresh accounts
  // - regenerate pitches
  // - store results

  return NextResponse.json({
    success: true,
    message: "Weekly cron ran successfully"
  })
}
