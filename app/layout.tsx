import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Unifarr - Unified Sonarr & Radarr Manager',
  description: 'Manage your Sonarr and Radarr instances from one unified interface',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

