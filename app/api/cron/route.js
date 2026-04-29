import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Weekly automation ran successfully",
    ran_at: new Date().toISOString()
  })
}
