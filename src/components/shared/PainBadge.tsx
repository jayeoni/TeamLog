interface Props {
  painArea: string
}

/**
 * PULSE pain pill. Inherits `.badge-orange` styling from index.css
 * (now warn-tinted with mono caps). Icon is a CSS-rendered ⚠ glyph
 * to keep the pill compact in dense table rows.
 */
export default function PainBadge({ painArea }: Props) {
  if (!painArea?.trim()) return null
  return (
    <span className="badge-orange" title={painArea}>
      <span aria-hidden className="leading-none">⚠</span>
      <span className="font-sans normal-case tracking-normal">{painArea}</span>
    </span>
  )
}
