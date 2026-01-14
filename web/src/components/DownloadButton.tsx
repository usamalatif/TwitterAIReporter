'use client'

import { useEffect, useState } from 'react'

// Download icon
const DownloadIcon = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

export default function DownloadButton() {
  const [downloads, setDownloads] = useState<number | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  // Fetch current download count on mount
  useEffect(() => {
    fetch('/api/download')
      .then(res => res.json())
      .then(data => setDownloads(data.downloads))
      .catch(() => setDownloads(0))
  }, [])

  const handleDownload = async () => {
    if (isDownloading) return

    setIsDownloading(true)

    // Track the download
    try {
      const res = await fetch('/api/download', { method: 'POST' })
      const data = await res.json()
      if (data.downloads) {
        setDownloads(data.downloads)
      }
    } catch (error) {
      console.error('Failed to track download:', error)
    }

    // Trigger the actual download
    const link = document.createElement('a')
    link.href = '/kitha-extension-min.zip'
    link.download = 'Kitha AI Tweet Detector.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setIsDownloading(false)
  }

  return (
    <div className="text-center">
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 text-lg font-semibold text-white transition hover:from-purple-600 hover:to-pink-600 disabled:opacity-70"
      >
        <DownloadIcon className="h-6 w-6" />
        {isDownloading ? 'Downloading...' : 'Download Kitha Extension'}
      </button>
      <p className="mt-3 text-sm text-slate-500">
        Version 2.0.0 • Chrome Browser
        {downloads !== null && downloads > 0 && (
          <span className="ml-2 text-purple-400">
            • {downloads.toLocaleString()} downloads
          </span>
        )}
      </p>
    </div>
  )
}
