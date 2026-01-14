'use client'

import { useEffect, useState } from 'react'

interface Stats {
  totalScans: number
  aiDetected: number
  humanDetected: number
}

// Format number with commas (e.g., 1234567 -> 1,234,567)
function formatNumber(num: number): string {
  return num.toLocaleString()
}

export default function StatsCounter() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => setStats({ totalScans: 0, aiDetected: 0, humanDetected: 0 }))
  }, [])

  if (!stats || stats.totalScans === 0) {
    return null // Don't show if no stats yet
  }

  const aiPercentage = stats.totalScans > 0
    ? Math.round((stats.aiDetected / stats.totalScans) * 100)
    : 0
  const humanPercentage = 100 - aiPercentage

  return (
    <section className="container mx-auto px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-2xl font-bold text-white md:text-3xl">
          Community Stats
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Total Scans */}
          <div className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 text-center backdrop-blur-sm">
            <div className="mb-2 text-4xl font-bold text-white md:text-5xl">
              {formatNumber(stats.totalScans)}
            </div>
            <p className="text-slate-300">Tweets Analyzed</p>
          </div>

          {/* AI Detected */}
          <div className="rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 p-6 text-center backdrop-blur-sm">
            <div className="mb-2 text-4xl font-bold text-red-400 md:text-5xl">
              {formatNumber(stats.aiDetected)}
            </div>
            <p className="text-slate-300">AI-Generated ({aiPercentage}%)</p>
          </div>

          {/* Human */}
          <div className="rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 text-center backdrop-blur-sm">
            <div className="mb-2 text-4xl font-bold text-green-400 md:text-5xl">
              {formatNumber(stats.humanDetected)}
            </div>
            <p className="text-slate-300">Human-Written ({humanPercentage}%)</p>
          </div>
        </div>
      </div>
    </section>
  )
}
