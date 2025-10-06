import * as React from "react"
import { Input } from "./input"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number | string
  onChange?: (value: string) => void
  showZero?: boolean // Whether to show 0 as "0" or as empty
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, showZero = false, placeholder = "0.00", ...props }, ref) => {
    // Convert numeric value to display value
    const getDisplayValue = (val: number | string | undefined): string => {
      if (val === undefined || val === null || val === '') {
        return ''
      }
      
      const numVal = typeof val === 'string' ? parseFloat(val) : val
      
      // If value is 0 and showZero is false, show empty string
      if (numVal === 0 && !showZero) {
        return ''
      }
      
      // If it's a valid number, return it as string
      if (!isNaN(numVal)) {
        return numVal.toString()
      }
      
      return ''
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      
      // Allow empty string
      if (inputValue === '') {
        onChange?.('')
        return
      }
      
      // Remove any non-numeric characters except decimal point and minus
      const cleanValue = inputValue.replace(/[^0-9.-]/g, '')
      
      // Validate the number format
      if (cleanValue === '' || cleanValue === '-' || !isNaN(parseFloat(cleanValue))) {
        onChange?.(cleanValue)
      }
    }

    return (
      <Input
        type="text"
        className={cn(className)}
        value={getDisplayValue(value)}
        onChange={handleChange}
        placeholder={placeholder}
        ref={ref}
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
