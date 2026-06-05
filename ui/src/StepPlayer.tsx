interface Props {
  steps: number[]
  currentStep: number | null
  stepLabel: string
  onStep: (n: number) => void
  onClose: () => void
}

export function StepPlayer({ steps, currentStep, stepLabel, onStep, onClose }: Props) {
  if (steps.length === 0) return null

  const idx = currentStep != null ? steps.indexOf(currentStep) : -1
  const canPrev = idx > 0
  const canNext = idx < steps.length - 1
  const last = steps[steps.length - 1]

  return (
    <div style={styles.player}>
      <button onClick={onClose} style={styles.closeBtn} title="Close">✕</button>

      <div style={styles.divider} />

      <div style={styles.controls}>
        <button
          onClick={() => onStep(steps[0])}
          disabled={!canPrev}
          style={{ ...styles.btn, opacity: canPrev ? 1 : 0.3 }}
          title="First step"
        >⏮</button>
        <button
          onClick={() => canPrev && onStep(steps[idx - 1])}
          disabled={!canPrev}
          style={{ ...styles.btn, opacity: canPrev ? 1 : 0.3 }}
          title="Previous step"
        >◀</button>
        <button
          onClick={() => canNext && onStep(steps[idx + 1])}
          disabled={!canNext}
          style={{ ...styles.btn, opacity: canNext ? 1 : 0.3 }}
          title="Next step"
        >▶</button>
        <button
          onClick={() => onStep(last)}
          disabled={!canNext}
          style={{ ...styles.btn, opacity: canNext ? 1 : 0.3 }}
          title="Last step"
        >⏭</button>
      </div>

      <div style={styles.divider} />

      {/* Fixed-width info — always rendered to prevent layout shift */}
      <div style={styles.info}>
        <span style={styles.counter}>
          {currentStep != null ? `Step ${currentStep} / ${last}` : `— / ${last}`}
        </span>
        <span style={{ ...styles.label, visibility: stepLabel ? 'visible' : 'hidden' }}>
          {stepLabel || 'placeholder'}
        </span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  player: {
    position: 'absolute',
    bottom: 52,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '7px 12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(8px)',
    zIndex: 10,
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--subtle)',
    fontSize: 11,
    padding: '0 2px',
    lineHeight: 1,
    flexShrink: 0,
  },
  divider: {
    width: 1,
    height: 18,
    background: 'var(--border)',
    flexShrink: 0,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  btn: {
    background: 'var(--backdrop-heavy)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--muted)',
    fontSize: 13,
    cursor: 'pointer',
    padding: '3px 8px',
    lineHeight: 1,
    width: 32,
    textAlign: 'center',
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: 240,
    flexShrink: 0,
    overflow: 'hidden',
  },
  counter: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ea7317',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
  label: {
    fontSize: 12,
    color: 'var(--muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}
