interface Props {
  value: number
  onChange?: (v: number) => void
  size?: 'sm' | 'md'
}

const labels = ['', '매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음']

/**
 * PULSE condition rating — 5 square cells filled chartreuse.
 * API unchanged from the original (value, onChange, size).
 */
export default function ConditionStars({ value, onChange, size = 'md' }: Props) {
  const cell = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const gap = size === 'sm' ? 'gap-[3px]' : 'gap-1'
  const labelSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]'
  const interactive = !!onChange

  return (
    <div className={`inline-flex items-center ${gap}`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value
        return (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(n)}
            aria-label={`컨디션 ${n}점`}
            className={[
              cell,
              'rounded-[2px] transition-all duration-100',
              filled
                ? 'bg-[var(--color-pulse-accent)]'
                : 'bg-transparent border border-[var(--color-pulse-line2)]',
              interactive
                ? 'cursor-pointer hover:scale-110'
                : 'cursor-default',
            ].join(' ')}
          />
        )
      })}
      {value > 0 && (
        <span
          className={`font-mono ${labelSize} ml-2 text-[var(--color-pulse-sub)] tabular-nums`}
        >
          {value}.0
          <span className="text-[var(--color-pulse-sub2)] ml-1 font-sans">{labels[value]}</span>
        </span>
      )}
    </div>
  )
}
