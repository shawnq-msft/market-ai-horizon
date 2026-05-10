import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Global AI Value Chain Map',
  description: '全球 AI 产业链情报看板',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
