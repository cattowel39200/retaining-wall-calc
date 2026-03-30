import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'StructCheck — 구조검토 클라우드',
  description: '설치 없이 웹에서 즉시, KDS 기준 옹벽·U형개거 구조검토 + 우수 수리계산 + 보고서 자동 생성. 무료로 시작하세요.',
  openGraph: {
    title: 'StructCheck — 구조검토 클라우드',
    description: '설치 없이 웹에서 즉시, KDS 기준 옹벽·U형개거 구조검토 + 우수 수리계산 + 보고서 자동 생성',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="relative mx-auto max-w-6xl px-6 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="mb-4 inline-block rounded-full bg-blue-700/50 px-4 py-1.5 text-sm font-medium">
              KDS 11 80 05 / KDS 14 20 20 완전 반영
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              건설 엔지니어링,<br />
              <span className="text-blue-300">웹에서 바로.</span>
            </h1>
            <p className="mt-6 text-lg text-blue-100 sm:text-xl max-w-2xl">
              설치 없이 브라우저에서 옹벽 구조검토, U형개거 설계, 우수 수리계산을 즉시 수행하고,
              보고서를 자동 생성합니다. 무료로 시작하세요.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/calc"
                className="rounded-lg bg-white px-8 py-3.5 text-lg font-bold text-blue-900 shadow-lg hover:bg-blue-50 transition-colors"
              >
                옹벽 구조검토
              </Link>
              <a
                href="/hydro"
                className="rounded-lg bg-emerald-500 px-8 py-3.5 text-lg font-bold text-white shadow-lg hover:bg-emerald-600 transition-colors"
              >
                수리계산서
              </a>
              <Link
                href="/channel"
                className="rounded-lg bg-amber-500 px-8 py-3.5 text-lg font-bold text-white shadow-lg hover:bg-amber-600 transition-colors"
              >
                U형개거
              </Link>
              <a
                href="#features"
                className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-lg font-medium hover:bg-white/10 transition-colors"
              >
                기능 알아보기
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-gray-50 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5 text-center">
            {[
              ['3종', '검토 프로그램'],
              ['4종', '옹벽 형식'],
              ['KDS', '최신 기준'],
              ['즉시', '결과 확인'],
              ['무료', '지금 바로'],
            ].map(([num, label]) => (
              <div key={label}>
                <div className="text-3xl font-extrabold text-blue-600">{num}</div>
                <div className="mt-1 text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">왜 StructCheck인가?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-500">
            기존 고가의 설치형 프로그램 대신, 웹 브라우저 하나로 건설 엔지니어링 검토를 완료합니다.
          </p>

          {/* 서비스 카드 3개 */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Link href="/calc" className="block rounded-xl border-2 border-blue-200 bg-blue-50 p-8 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="text-3xl mb-3">📐</div>
              <h3 className="text-xl font-bold text-blue-800">옹벽 구조검토</h3>
              <p className="mt-2 text-sm text-blue-600">L형, 역L형, 역T형, 중력식 4종 옹벽. KDS 기준 안정검토 + 단면검토 + Word 보고서 자동 생성.</p>
              <div className="mt-4 text-sm font-bold text-blue-700">시작하기 →</div>
            </Link>
            <Link href="/hydro" className="block rounded-xl border-2 border-emerald-200 bg-emerald-50 p-8 hover:border-emerald-400 hover:shadow-lg transition-all">
              <div className="text-3xl mb-3">🌊</div>
              <h3 className="text-xl font-bold text-emerald-800">우수 수리계산서</h3>
              <p className="mt-2 text-sm text-emerald-600">강우강도식, Manning 유속, 원형관/BOX/U형 수로. 구간별 수리검토 + 보고서 인쇄.</p>
              <div className="mt-4 text-sm font-bold text-emerald-700">시작하기 →</div>
            </Link>
            <Link href="/channel" className="block rounded-xl border-2 border-amber-200 bg-amber-50 p-8 hover:border-amber-400 hover:shadow-lg transition-all">
              <div className="text-3xl mb-3">🏗️</div>
              <h3 className="text-xl font-bold text-amber-800">U형개거 구조검토</h3>
              <p className="mt-2 text-sm text-amber-600">토압+수압+활하중(DB-24). 측벽·저판 RC 단면검토 (휨/전단/균열). KDS 기준.</p>
              <div className="mt-4 text-sm font-bold text-amber-700">시작하기 →</div>
            </Link>
          </div>

          <h3 className="text-center text-2xl font-bold text-gray-900 mt-16 mb-4">주요 기능</h3>

          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: '🌐',
                title: '설치 불필요',
                desc: '브라우저에서 바로 실행. PC, 태블릿, 어디서든 접속하여 검토를 수행합니다.',
              },
              {
                icon: '📐',
                title: '4종 옹벽 통합',
                desc: 'L형, 역L형, 역T형, 중력식/반중력식 옹벽을 하나의 화면에서 검토합니다.',
              },
              {
                icon: '🌊',
                title: '우수 수리계산',
                desc: '강우강도, Manning 유속, Rational Method. 원형관, BOX, U형 수로 검토.',
              },
              {
                icon: '🏗️',
                title: 'U형개거 설계',
                desc: '토압+수압+활하중. 측벽·저판 RC 단면검토 (휨/전단/균열).',
              },
              {
                icon: '📄',
                title: '보고서 자동',
                desc: '옹벽 Word 보고서, 수리계산서 인쇄. 입력 즉시 자동 생성합니다.',
              },
              {
                icon: '✅',
                title: 'KDS 기준 100%',
                desc: 'KDS 11 80 05, KDS 14 20 20 기준 완전 반영. 안정검토 + 단면검토 + 균열검토.',
              },
              {
                icon: '💰',
                title: '무료 사용',
                desc: '사업자등록 없이 누구나 무료로 사용할 수 있습니다. 제한 없음.',
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">3단계로 완료</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { step: '1', title: '입력', desc: '옹벽 형식 선택, 단면 치수·지반조건·철근 배근 입력' },
              { step: '2', title: '계산', desc: '안정검토(활동/전도/편심/지지력) + 단면검토(휨/전단/균열) 자동 수행' },
              { step: '3', title: '보고서', desc: 'Word 구조계산서 자동 생성, 즉시 다운로드' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/calc"
              className="inline-block rounded-lg bg-blue-600 px-8 py-3.5 text-lg font-bold text-white shadow hover:bg-blue-700 transition-colors"
            >
              지금 구조검토 시작하기
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">요금 안내</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-500">
            현재 모든 기능을 무료로 제공합니다.
          </p>

          <div className="mx-auto mt-12 grid max-w-3xl gap-8 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-xl border-2 border-blue-600 p-8">
              <div className="text-sm font-medium text-blue-600">현재</div>
              <div className="mt-2 text-4xl font-extrabold text-gray-900">무료</div>
              <p className="mt-2 text-sm text-gray-500">모든 기능 제한 없이 사용</p>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                {[
                  '옹벽 4종 (L형/역L형/역T형/중력식)',
                  '우수 수리계산서 (관/BOX/수로)',
                  'U형개거 구조검토 (토압+수압+활하중)',
                  '안정검토 + 단면검토 + 부재설계',
                  'Word 보고서 / 수리계산서 인쇄',
                  'SVG 표준단면도',
                  '회원가입 불필요',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/calc"
                className="mt-8 block rounded-lg bg-blue-600 py-3 text-center font-bold text-white hover:bg-blue-700 transition-colors"
              >
                무료로 시작
              </Link>
            </div>

            {/* Pro (Coming Soon) */}
            <div className="rounded-xl border border-gray-200 p-8 opacity-70">
              <div className="text-sm font-medium text-gray-400">준비 중</div>
              <div className="mt-2 text-4xl font-extrabold text-gray-400">Pro</div>
              <p className="mt-2 text-sm text-gray-400">추가 구조물 + 팀 기능</p>
              <ul className="mt-6 space-y-3 text-sm text-gray-400">
                {[
                  '무료 기능 전체 포함',
                  '암거, 슬래브, 토류벽 (추가 예정)',
                  '팀 관리, 프로젝트 이력',
                  'API 연동',
                  '우선 기술지원',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 block rounded-lg border border-gray-300 py-3 text-center font-bold text-gray-400">
                출시 예정
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support / Donation */}
      <section className="bg-blue-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">서비스가 도움이 되셨나요?</h2>
          <p className="mt-4 text-gray-600">
            StructCheck는 건설 엔지니어를 위해 무료로 운영됩니다.<br />
            후원해 주시면 서버 유지와 구조물 추가 개발에 큰 도움이 됩니다.
          </p>
          <div className="mt-8 rounded-xl bg-white border border-blue-200 p-6 inline-block text-left">
            <div className="text-sm font-medium text-gray-500 mb-2">후원 계좌</div>
            <div className="text-lg font-bold text-gray-900">카카오뱅크 3333-00-0000000</div>
            <div className="text-sm text-gray-500 mt-1">예금주: StructCheck</div>
            <div className="mt-4 text-xs text-gray-400">
              * 후원은 자발적이며, 무료 사용에 영향을 주지 않습니다.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div>
              <div className="text-lg font-bold text-gray-900">StructCheck</div>
              <div className="text-sm text-gray-500">구조검토 클라우드 SaaS</div>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/calc" className="hover:text-blue-600">옹벽 구조검토</Link>
              <Link href="/hydro" className="hover:text-emerald-600">수리계산서</Link>
              <Link href="/channel" className="hover:text-amber-600">U형개거</Link>
              <a href="#features" className="hover:text-blue-600">기능</a>
              <a href="#pricing" className="hover:text-blue-600">요금</a>
              <a href="mailto:structcheck@gmail.com" className="hover:text-blue-600">문의</a>
            </div>
            <div className="text-xs text-gray-400">
              적용기준: KDS 11 80 05 / KDS 14 20 20
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
