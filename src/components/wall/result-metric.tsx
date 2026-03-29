interface ResultMetricProps {
  label: string
  value: string
  ok: boolean
}

export default function ResultMetric({ label, value, ok }: ResultMetricProps) {
  return (
    <div
      className={`rounded-lg border-2 px-4 py-2 text-center ${
        ok ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
      }`}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-sm font-bold ${ok ? 'text-green-700' : 'text-red-700'}`}>
        {value}
      </div>
    </div>
  )
}
