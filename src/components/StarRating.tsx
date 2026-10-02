import { useState } from 'react'

function Star({ fill }: { fill: 0 | 0.5 | 1 }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full">
      <defs>
        <linearGradient id={`half-${fill}`}>
          <stop offset={fill === 1 ? '100%' : fill === 0.5 ? '50%' : '0%'} style={{ stopColor: "var(--signal)" }} />
          <stop offset={fill === 1 ? '100%' : fill === 0.5 ? '50%' : '0%'} style={{ stopColor: "var(--surface-3)" }} />
        </linearGradient>
      </defs>
      <path
        fill={`url(#half-${fill})`}
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
      />
    </svg>
  )
}

function fillFor(value: number, i: number): 0 | 0.5 | 1 {
  if (value >= i + 1) return 1
  if (value >= i + 0.5) return 0.5
  return 0
}

/** Estrellas de 0.5 a 5. Sin `onChange` es de solo lectura. */
export function StarRating({
  value = 0,
  onChange,
  size = 'md',
}: {
  value?: number
  onChange?: (v: number | undefined) => void
  size?: 'sm' | 'md' | 'lg'
}) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value
  const px = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-10 w-10' : 'h-5 w-5'

  if (!onChange) {
    return (
      <div className="flex" aria-label={`${value} de 5 estrellas`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={px}>
            <Star fill={fillFor(value, i)} />
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Puntaje">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`relative ${px}`}>
            <Star fill={fillFor(shown, i)} />
            {[0.5, 1].map((half) => {
              const v = i + half
              return (
                <button
                  key={half}
                  type="button"
                  role="radio"
                  aria-checked={value === v}
                  aria-label={`${v} estrellas`}
                  onMouseEnter={() => setHover(v)}
                  onClick={() => onChange(value === v ? undefined : v)}
                  data-vaul-no-drag=""
                  className={`absolute inset-y-0 w-1/2 cursor-pointer ${half === 0.5 ? 'left-0' : 'right-0'}`}
                />
              )
            })}
          </span>
        ))}
      </div>
      <span className="w-8 font-mono text-sm text-dim tabular-nums">{shown ? shown.toFixed(1) : '—'}</span>
    </div>
  )
}
