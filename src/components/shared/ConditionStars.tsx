interface Props {
  value: number
  onChange?: (v: number) => void
  size?: 'sm' | 'md'
}

const labels = ['', '매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음']

const colors = [
  '',
  'text-red-500',
  'text-orange-500',
  'text-yellow-500',
  'text-lime-500',
  'text-emerald-500',
]

export default function ConditionStars({ value, onChange, size = 'md' }: Props) {
  const sz = size === 'sm' ? 'text-base' : 'text-xl'

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${sz} transition-transform duration-100 ${onChange ? 'hover:scale-125 cursor-pointer' : 'cursor-default'} ${
            n <= value ? colors[value] : 'text-gray-300 dark:text-gray-600'
          }`}
        >
          ●
        </button>
      ))}
      {value > 0 && (
        <span className={`text-xs font-medium ${colors[value]} ml-1`}>
          {labels[value]}
        </span>
      )}
    </div>
  )
}
