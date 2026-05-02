import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Props = {
  decrementLoading?: boolean
  disabled?: boolean
  incrementLoading?: boolean
  min?: number
  onChange: (value: number) => void
  value: number
}

export const QuantityStepper = ({ decrementLoading = false, disabled = false, incrementLoading = false, min = 1, onChange, value }: Props) => {
  return (
    <div className="flex items-center gap-2">
      <Button disabled={disabled || value <= min} loading={decrementLoading} onClick={() => onChange(Math.max(min, value - 1))} size="sm" type="button" variant="outline">
        -
      </Button>
      <Badge variant="outline">{value}</Badge>
      <Button disabled={disabled} loading={incrementLoading} onClick={() => onChange(value + 1)} size="sm" type="button" variant="outline">
        +
      </Button>
    </div>
  )
}
