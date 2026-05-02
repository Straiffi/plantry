import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Props = {
  disabled?: boolean
  min?: number
  onChange: (value: number) => void
  value: number
}

export const QuantityStepper = ({ disabled = false, min = 1, onChange, value }: Props) => {
  return (
    <div className="flex items-center gap-2">
      <Button disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))} size="sm" type="button" variant="outline">
        -
      </Button>
      <Badge variant="outline">{value}</Badge>
      <Button disabled={disabled} onClick={() => onChange(value + 1)} size="sm" type="button" variant="outline">
        +
      </Button>
    </div>
  )
}
