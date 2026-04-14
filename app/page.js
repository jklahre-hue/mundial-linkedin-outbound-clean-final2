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
    brand: String(row.brand || row["brand name"] || "").trim(),
    category: String(row.category || "").trim(),
    priority: String(row.priority || row["priority tier"] || "").trim(),
    notes: String(row.notes || "").trim(),
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

  const topAccounts = useMemo(() => {
    const scored = [...accounts].map((account) => {
      let score = 50
      if ((account.priority || "").toUpperCase() === "A") score += 20
      if (["QSR", "Retail", "CPG", "Automotive"].includes(account.category)) score += 10
      if (account.notes) score += 10
      return { ...account, score }
    })

    return scored.sort((a, b) => b.score - a.score).slice(0, 4)
  }, [accounts])

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      <h1>Mundial LinkedIn Outbound App</h1>
      <p>Upload your Excel or CSV account list and preview the top accounts inside the app.</p>

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
              <div>Score: {account.score}</div>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <h2>Raw Account Preview</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Brand</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Category</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Priority</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, i) => (
                <tr key={`${account.brand}-${i}`}>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{account.brand}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{account.category}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{account.priority}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{account.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
