"use client"

import { useEffect, useState } from "react"

export default function Home() {
  const [report, setReport] = useState([])

  async function load() {
    const res = await fetch("/api/reports/latest")
    const data = await res.json()
    setReport(data.brands || [])
  }

  async function run() {
    await fetch("/api/workflows/run-weekly", { method: "POST" })
    load()
  }

  function openGmail(email, subject, body) {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(url, "_blank")
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Mundial LinkedIn Outbound App</h1>

      <button onClick={run} style={{ padding: "10px 16px", marginBottom: 20 }}>
        Run Workflow
      </button>

      {report.map((brand) => (
        <div
          key={brand.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h2>{brand.brand_name}</h2>
          <p>{brand.why_now}</p>

          {brand.contacts.map((contact, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #eee",
                borderRadius: 6,
                padding: 12,
                marginTop: 10,
              }}
            >
              <strong>{contact.full_name}</strong> — {contact.title}

              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() =>
                    openGmail(
                      contact.email,
                      contact.personalized_subject || "Quick idea",
                      contact.personalized_email || ""
                    )
                  }
                  style={{ padding: "8px 12px" }}
                >
                  Send Email
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
