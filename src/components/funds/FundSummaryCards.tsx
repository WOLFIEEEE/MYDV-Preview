'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  PoundSterling, 
  TrendingDown, 
  TrendingUp,
  Percent,
  PiggyBank,
  Building2
} from 'lucide-react'

interface FundSummaryData {
  totalFunds: number
  totalUsed: number
  totalRepaid: number
  totalInterest: number
  availableAmount: number
  outstandingAmount: number
  activeFunds: number
  utilizationPercentage: number
  dealershipInvestment?: number
}

interface FundSummaryCardsProps {
  summary: FundSummaryData
  isLoading?: boolean
}

export function FundSummaryCards({ summary, isLoading }: FundSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`
  }

  if (isLoading) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
  }

  const cards = [
    {
      title: 'Total Funds',
      value: formatCurrency(summary.totalFunds),
      icon: PiggyBank,
      description: `${summary.activeFunds} active fund${summary.activeFunds !== 1 ? 's' : ''}`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Used',
      value: formatCurrency(summary.totalUsed),
      icon: TrendingDown,
      description: 'Withdrawn from funds',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Total Repaid',
      value: formatCurrency(summary.totalRepaid),
      icon: TrendingUp,
      description: 'Amount paid back to funds',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Available Amount',
      value: formatCurrency(summary.availableAmount),
      icon: PoundSterling,
      description: 'Ready to use',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Current Utilization',
      value: formatPercentage(summary.utilizationPercentage),
      icon: Percent,
      description: 'Outstanding amount vs total funds',
      color: summary.utilizationPercentage > 80 ? 'text-red-600' : 
             summary.utilizationPercentage > 60 ? 'text-orange-600' : 'text-green-600',
      bgColor: summary.utilizationPercentage > 80 ? 'bg-red-100' : 
               summary.utilizationPercentage > 60 ? 'bg-orange-100' : 'bg-green-100',
    },
    {
      title: 'Dealership Investment',
      value: formatCurrency(summary.dealershipInvestment || 0),
      icon: Building2,
      description: 'Your total investment in inventory',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
