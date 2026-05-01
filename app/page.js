"use client"

import { useState } from "react"

export default function Home() {
  const [status, setStatus] = useState("Ready")
  const [results, setResults] = useState(null)

  async function refreshTopAccounts() {
    setStatus("Refreshing top accounts...")

    try {
      const res = await fetch("/api/cron")
      const data = await res.json()

      if (!res.ok) {
        setStatus(data.error || "Refresh failed")
        return
      }

      setResults(data)
      setStatus(`Refresh complete — ${data.count} accounts selected`)
    } catch (error) {
      setStatus("Something went wrong")
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <h1>Mundial LinkedIn Outbound App</h1>

      <p>
        Use this dashboard to manually refresh this week’s focus accounts and AI pitch recommendations.
      </p>

      <button
        onClick={refreshTopAccounts}
        style={{
          padding: "12px 18px",
          fontSize: 16,
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        Refresh Top 4 Accounts
      </button>

      <p>
        <strong>Status:</strong> {status}
      </p>

      {results?.top4?.map((account, index) => (
        <div
          key={account.brand}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginTop: 16,
          }}
        >
          <h2>
            #{index + 1} {account.brand}
          </h2>

          <p><strong>Category:</strong> {account.category}</p>
          <p><strong>Priority:</strong> {account.priority}</p>
          <p><strong>Score:</strong> {account.score}</p>

          {account.best_headline && (
            <p><strong>Best Headline:</strong> {account.best_headline}</p>
          )}

          <p><strong>Why Now:</strong> {account.why_now}</p>
          <p><strong>Subject Line:</strong> {account.subject_line}</p>

          <p><strong>Email:</strong></p>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Arial" }}>
            {account.email_body}
          </pre>

          <p><strong>Follow-Up:</strong></p>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Arial" }}>
            {account.follow_up_email}
          </pre>
        </div>
      ))}
    </main>
  )
}
