"use client"

import { useMemo, useState } from "react"
import * as XLSX from "xlsx"

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

  return lines.slice(1).map((line) => {
    const values = line.split(",")
    const row = {}
    headers.forEach((header, i) => {
      row[header] = (values[i] || "").trim()
    })
    return row
  })
}

function normalizeAccountRow(row) {
  return {
    brand: String(
      row.brand ||
      row["brand name"] ||
      row.company ||
      row.advertiser ||
      row["account name"] ||
      ""
    ).trim(),
    category: String(
      row.category ||
      row.vertical ||
      row.industry ||
      ""
    ).trim(),
    priority: String(
      row.priority ||
      row["priority tier"] ||
      row.tier ||
      ""
    ).trim(),
    notes: String(
      row.notes ||
      row.comments ||
      row.comment ||
      row["sales notes"] ||
      ""
    ).trim(),
  }
}

export default function Home() {
  const [accounts, setAccounts] = useState([
    {
      brand: "Pizza Hut",
      category: "QSR",
      priority: "A",
      notes: "Strong QSR fit and promotional cadence.",
    },
  ])
  const [uploadMessage, setUploadMessage] = useState("No file uploaded yet.")
  const [pitches, setPitches] = useState({})
  const [loadingBrand, setLoadingBrand] = useState("")

  async function handleFileUpload(file) {
    if (!file) return

    try {
      const lowerName = file.name.toLowerCase()

      if (lowerName.endsWith(".csv")) {
        const text = await file.text()
        const parsed = parseCsv(text).map(normalizeAccountRow).filter((row) => row.brand)
        setAccounts(parsed)
        setUploadMessage(`Loaded ${parsed.length} account rows from CSV.`)
        return
      }

      if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })
        const parsed = json.map(normalizeAccountRow).filter((row) => row.brand)
        setAccounts(parsed)
        setUploadMessage(`Loaded ${parsed.length} account rows from Excel.`)
        return
      }

      setUploadMessage("Please upload a .csv, .xlsx, or .xls file.")
    } catch (error) {
      console.error(error)
      setUploadMessage("There was a problem reading that file.")
    }
  }

  async function generatePitch(account) {
    setLoadingBrand(account.brand)

    try {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(account)
      })

      const data = await res.json()

      setPitches((prev) => ({
        ...prev,
        [account.brand]: data
      }))
    } catch (error) {
      console.error(error)
      setPitches((prev) => ({
        ...prev,
        [account.brand]: {
          why_now: "Pitch generation failed.",
          subject_line: "",
          email_body: ""
        }
      }))
    } finally {
      setLoadingBrand("")
    }
  }

const topAccounts = useMemo(() => {
  const scored = [...accounts].map((account) => {
    let score = 50

    const priority = (account.priority || "").toUpperCase()
    const category = (account.category || "").toLowerCase()
    const notes = (account.notes || "").toLowerCase()

    if (priority === "A") score += 20
    if (priority === "B") score += 10

    if (["qsr", "retail", "cpg", "automotive"].includes(category)) score += 15

    if (
      notes.includes("promotion") ||
      notes.includes("promotional") ||
      notes.includes("lto") ||
      notes.includes("launch") ||
      notes.includes("product launch")
    ) {
      score += 15
    }

    if (
      notes.includes("multicultural") ||
      notes.includes("hispanic") ||
      notes.includes("growth audience") ||
      notes.includes("growth audiences")
    ) {
      score += 15
    }

    if (
      notes.includes("contextual") ||
      notes.includes("privacy-safe") ||
      notes.includes("cookie-less") ||
      notes.includes("cookieless")
    ) {
      score += 10
    }

    if (
      notes.includes("culture") ||
      notes.includes("cultural") ||
      notes.includes("in-culture") ||
      notes.includes("sports") ||
      notes.includes("seasonal")
    ) {
      score += 10
    }

    return { ...account, score }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, 4)
}, [accounts])

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      <h1>Mundial LinkedIn Outbound App</h1>
      <p>Upload your Excel or CSV account list, rank top accounts, and generate AI outreach.</p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          background: "#fafafa",
        }}
      >
        <h2>Upload Account List</h2>
        <p style={{ marginTop: 0 }}>Supported fields: brand, category, priority, notes</p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
        />
        <p style={{ marginTop: 12 }}><strong>Status:</strong> {uploadMessage}</p>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <h2>Top 4 Accounts</h2>
        {topAccounts.length === 0 ? (
          <p>No accounts loaded yet.</p>
        ) : (
          topAccounts.map((account, i) => (
            <div
              key={`${account.brand}-${i}`}
              style={{
                border: "1px solid #eee",
                borderRadius: 6,
                padding: 12,
                marginTop: 10,
              }}
            >
              <strong>#{i + 1} {account.brand}</strong>
              <div>Category: {account.category || "—"}</div>
              <div>Priority: {account.priority || "—"}</div>
              <div>Notes: {account.notes || "—"}</div>
              <div><strong>Mundial Fit Score:</strong> {account.score}</div>

              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => generatePitch(account)}
                  style={{ padding: "8px 12px" }}
                >
                  {loadingBrand === account.brand ? "Generating..." : "Generate AI Pitch"}
                </button>
              </div>

              {pitches[account.brand] && (
                <div style={{ marginTop: 16, padding: 12, background: "#fafafa", borderRadius: 6 }}>
                  <div><strong>Why now:</strong> {pitches[account.brand].why_now}</div>
                  <div style={{ marginTop: 8 }}><strong>Subject line:</strong> {pitches[account.brand].subject_line}</div>
                  <div style={{ marginTop: 8 }}><strong>Email:</strong></div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{pitches[account.brand].email_body}</div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
