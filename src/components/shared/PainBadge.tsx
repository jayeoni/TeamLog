import { AlertTriangle } from 'lucide-react'

interface Props {
  painArea: string
}

export default function PainBadge({ painArea }: Props) {
  if (!painArea?.trim()) return null
  return (
    <span className="badge-orange">
      <AlertTriangle size={11} />
      {painArea}
    </span>
  )
}
