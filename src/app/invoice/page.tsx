'use client'

import InvoiceForm from '@/components/invoice/InvoiceForm'
import { useEffect, useState } from 'react'

export default function InvoicePage() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className={`min-h-screen w-full transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <InvoiceForm />
    </div>
  )
}