"use client"

import { useEffect, useState } from "react"

export default function Home() {
  const [weeklyPitches, setWeeklyPitches] = useState([])

  async function loadWeeklyPitches() {
    const res = await fetch("/api/reports/latest")
    const data = await res.json()
    setWeeklyPitches(data.weekly_pitches || [])
  }

  async function runWeeklyCronNow() {
    await fetch("/api/cron")
    loadWeeklyPitches()
  }

  function openGmail(subject, body) {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(url, "_blank")
  }

  useEffect(() => {
    loadWeeklyPitches()
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      <h1>Mundial LinkedIn Outbound App</h1>
      <p>This view shows the latest weekly pitch set.</p>

      <button onClick={runWeeklyCronNow} style={{ padding: "10px 16px", marginBottom: 20 }}>
        Run Weekly Pitch Generation Now
      </button>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <h2>This Week’s Pitches</h2>

        {weeklyPitches.length === 0 ? (
          <p>No weekly pitches available yet.</p>
        ) : (
          weeklyPitches.map((pitch, i) => (
            <div
              key={`${pitch.brand}-${i}`}
              style={{
                border: "1px solid #eee",
                borderRadius: 6,
                padding: 12,
                marginTop: 10,
              }}
            >
              <strong>#{i + 1} {pitch.brand}</strong>
              <div>Category: {pitch.category || "—"}</div>
              <div>Priority: {pitch.priority || "—"}</div>
              <div>Score: {pitch.score || "—"}</div>
              <div style={{ marginTop: 8 }}><strong>Why now:</strong> {pitch.why_now}</div>
              <div style={{ marginTop: 8 }}><strong>Subject line:</strong> {pitch.subject_line}</div>
              <div style={{ marginTop: 8 }}><strong>Email:</strong></div>
              <div style={{ whiteSpace: "pre-wrap" }}>{pitch.email_body}</div>

              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => openGmail(pitch.subject_line, pitch.email_body)}
                  style={{ padding: "8px 12px" }}
                >
                  Open Gmail Draft
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
