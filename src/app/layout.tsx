import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'StructCheck — 구조검토 클라우드', template: '%s | StructCheck' },
  description: '설치 없이 웹에서 즉시, KDS 기준 옹벽 구조검토 + 보고서 자동 생성',
  metadataBase: new URL('https://structcheck.vercel.app'),
  openGraph: {
    siteName: 'StructCheck',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-blue-600">StructCheck</span>
            <span className="hidden sm:inline text-xs text-gray-400">구조검토 클라우드</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/calc" className="text-gray-600 hover:text-blue-600 font-medium">옹벽 구조검토</Link>
            <Link href="/hydro" className="text-gray-600 hover:text-emerald-600 font-medium">수리계산서</Link>
            <Link href="/channel" className="text-gray-600 hover:text-amber-600 font-medium">콘크리트 개거</Link>
            <Link href="/#pricing" className="text-gray-600 hover:text-blue-600 font-medium">요금</Link>
            <Link
              href="/calc"
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              무료 시작
            </Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
