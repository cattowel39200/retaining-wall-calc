import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '옹벽 구조검토',
  description: '옹벽 구조검토 웹서비스 - L형, 역L형, 역T형, 중력식',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-800">옹벽 구조검토</h1>
          <span className="text-sm text-gray-400">KDS 11 80 05 / KDS 14 20 20</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
