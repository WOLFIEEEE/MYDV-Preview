'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, RefreshCw, AlertCircle, Banknote, Building, Clock, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'

// Import our custom components
import { FundSummaryCards } from '@/components/funds/FundSummaryCards'
import { FundSourceCard } from '@/components/funds/FundSourceCard'
import { FundSourceDialog, FundSourceFormData } from '@/components/funds/FundSourceDialog'
import { FundTransactionDialog, FundTransactionFormData } from '@/components/funds/FundTransactionDialog'
import { FundTransactionList } from '@/components/funds/FundTransactionList'

// Types
import { FundSource, FundTransaction } from '@/db/schema'

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

interface FundSourceWithSummary extends FundSource {
  totalUsed?: number
  totalRepaid?: number
  outstandingAmount?: number
  availableAmount?: number
  utilizationPercentage?: number
  repaymentPercentage?: number
}

export default function FundsManagementPage() {
  // State management
  const [activeTab, setActiveTab] = useState('sources')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Data state
  const [fundSources, setFundSources] = useState<FundSourceWithSummary[]>([])
  const [transactions, setTransactions] = useState<Array<{
    transaction: FundTransaction
    fundSource: { id: string; fundName: string } | null
  }>>([])
  const [dealershipInvestment, setDealershipInvestment] = useState<number>(0)
  const [summary, setSummary] = useState<FundSummaryData>({
    totalFunds: 0,
    totalUsed: 0,
    totalRepaid: 0,
    totalInterest: 0,
    availableAmount: 0,
    outstandingAmount: 0,
    activeFunds: 0,
    utilizationPercentage: 0,
    dealershipInvestment: 0,
  })

  // Form state
  const [showFundSourceForm, setShowFundSourceForm] = useState(false)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingFundSource, setEditingFundSource] = useState<FundSource | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<FundTransaction | null>(null)
  const [selectedFundSourceId, setSelectedFundSourceId] = useState<string>('')

  // Fetch data functions
  const fetchFundSources = async () => {
    try {
      const response = await fetch('/api/fund-sources')
      if (!response.ok) throw new Error('Failed to fetch fund sources')
      
      const data = await response.json()
      if (data.success) {
        setFundSources(data.data)
      }
    } catch (error) {
      console.error('Error fetching fund sources:', error)
      toast.error('Failed to load fund sources')
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/fund-transactions')
      if (!response.ok) throw new Error('Failed to fetch transactions')
      
      const data = await response.json()
      if (data.success) {
        setTransactions(data.data)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Failed to load transactions')
    }
  }

  const fetchDealershipInvestment = async (): Promise<number> => {
    try {
      const response = await fetch('/api/vehicle-funds')
      if (!response.ok) throw new Error('Failed to fetch vehicle funding data')
      
      const data = await response.json()
      if (data.success) {
        // Calculate dealership investment: Total Purchase Cost - Total Funding Amount
        let totalPurchaseCost = 0
        let totalFundingAmount = 0
        
        data.data.forEach((vehicle: any) => {
          if (vehicle.costOfPurchase) {
            totalPurchaseCost += parseFloat(vehicle.costOfPurchase)
          }
          if (vehicle.fundingAmount) {
            totalFundingAmount += parseFloat(vehicle.fundingAmount)
          }
        })
        
        return Math.max(0, totalPurchaseCost - totalFundingAmount)
      }
      return 0
    } catch (error) {
      console.error('Error fetching dealership investment:', error)
      return 0
    }
  }

  const calculateSummary = () => {
    const totalFunds = fundSources.reduce((sum, source) => sum + parseFloat(source.amount), 0)
    const activeFunds = fundSources.filter(source => source.status === 'active').length

    const totalUsed = transactions
      .filter(({ transaction }) => transaction.transactionType === 'usage' && transaction.status === 'completed')
      .reduce((sum, { transaction }) => sum + parseFloat(transaction.amount), 0)

    const totalRepaid = transactions
      .filter(({ transaction }) => transaction.transactionType === 'repayment' && transaction.status === 'completed')
      .reduce((sum, { transaction }) => sum + parseFloat(transaction.amount), 0)

    const totalInterest = transactions
      .filter(({ transaction }) => transaction.transactionType === 'interest_payment' && transaction.status === 'completed')
      .reduce((sum, { transaction }) => sum + parseFloat(transaction.amount), 0)

    const availableAmount = totalFunds - totalUsed + totalRepaid
    const outstandingAmount = totalUsed - totalRepaid
    // Utilization should be based on outstanding amount, not total used
    const utilizationPercentage = totalFunds > 0 ? (outstandingAmount / totalFunds) * 100 : 0

    setSummary({
      totalFunds,
      totalUsed,
      totalRepaid,
      totalInterest,
      availableAmount,
      outstandingAmount,
      activeFunds,
      utilizationPercentage,
      dealershipInvestment,
    })
  }

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const [, , investment] = await Promise.all([
        fetchFundSources(), 
        fetchTransactions(),
        fetchDealershipInvestment()
      ])
      setDealershipInvestment(investment)
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Recalculate summary when data changes
  useEffect(() => {
    calculateSummary()
  }, [fundSources, transactions, dealershipInvestment])

  // Fund source CRUD operations
  const handleCreateFundSource = async (data: FundSourceFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/fund-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create fund source')
      }

      const result = await response.json()
      if (result.success) {
        toast.success('Fund source created successfully')
        setShowFundSourceForm(false)
        setEditingFundSource(null)
        await fetchFundSources()
      }
    } catch (error) {
      console.error('Error creating fund source:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create fund source')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateFundSource = async (data: FundSourceFormData) => {
    if (!editingFundSource) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/fund-sources/${editingFundSource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update fund source')
      }

      const result = await response.json()
      if (result.success) {
        toast.success('Fund source updated successfully')
        setShowFundSourceForm(false)
        setEditingFundSource(null)
        await fetchFundSources()
      }
    } catch (error) {
      console.error('Error updating fund source:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update fund source')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteFundSource = async (id: string) => {
    try {
      const response = await fetch(`/api/fund-sources/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete fund source')
      }

      const result = await response.json()
      if (result.success) {
        toast.success('Fund source deleted successfully')
        await fetchFundSources()
        await fetchTransactions() // Refresh transactions as they might be affected
      }
    } catch (error) {
      console.error('Error deleting fund source:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete fund source')
    }
  }

  // Transaction CRUD operations
  const handleCreateTransaction = async (data: FundTransactionFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/fund-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create transaction')
      }

      const result = await response.json()
      if (result.success) {
        toast.success('Transaction created successfully')
        setShowTransactionForm(false)
        setEditingTransaction(null)
        setSelectedFundSourceId('')
        await fetchTransactions()
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateTransaction = async (data: FundTransactionFormData) => {
    if (!editingTransaction) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/fund-transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update transaction')
      }

      const result = await response.json()
      if (result.success) {
        toast.success('Transaction updated successfully')
        setShowTransactionForm(false)
        setEditingTransaction(null)
        await fetchTransactions()
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/fund-transactions/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete transaction')
      }

      const result = await response.json()
      if (result.success) {
        toast.success('Transaction deleted successfully')
        await fetchTransactions()
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete transaction')
    }
  }

  // Event handlers
  const handleRefresh = async () => {
    setIsLoading(true)
    const [, , investment] = await Promise.all([
      fetchFundSources(), 
      fetchTransactions(),
      fetchDealershipInvestment()
    ])
    setDealershipInvestment(investment)
    setIsLoading(false)
    toast.success('Data refreshed')
  }

  const handleEditFundSource = (fundSource: FundSource) => {
    setEditingFundSource(fundSource)
    setShowFundSourceForm(true)
  }

  const handleViewFundSource = (fundSource: FundSource) => {
    setSelectedFundSourceId(fundSource.id)
    setActiveTab('transactions')
  }

  const handleEditTransaction = (transaction: FundTransaction) => {
    console.log('🔍 FundsManagement - Edit transaction clicked:', transaction)
    setEditingTransaction(transaction)
    setShowTransactionForm(true)
  }

  const handleAddTransactionForFund = (fundSourceId: string) => {
    setSelectedFundSourceId(fundSourceId)
    setShowTransactionForm(true)
  }

  const handleCancelForm = () => {
    setShowFundSourceForm(false)
    setShowTransactionForm(false)
    setEditingFundSource(null)
    setEditingTransaction(null)
    setSelectedFundSourceId('')
  }


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      
      <div className="pt-16">
        {/* Professional Funds Management Header */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700/50">
          <div className="container mx-auto max-w-7xl px-4 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <Banknote className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      Funds Management
                    </h1>
                    <p className="text-slate-300 text-lg">
                      Manage your dealership financing sources and track fund utilization
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <span>{summary.activeFunds} Active Fund{summary.activeFunds !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>{summary.utilizationPercentage.toFixed(1)}% Utilization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Last updated: Today</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  onClick={() => setShowFundSourceForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fund Source
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Funds Management Content */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-7xl space-y-8">
            {/* Summary Cards */}
            <FundSummaryCards summary={summary} isLoading={isLoading} />

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sources">Fund Sources</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
              </TabsList>

              <TabsContent value="sources" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Fund Sources</h2>
                  <Button onClick={() => setShowFundSourceForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Fund Source
                  </Button>
                </div>

                {fundSources.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No Fund Sources</h3>
                      <p className="text-muted-foreground mb-4">
                        Get started by adding your first funding source
                      </p>
                      <Button onClick={() => setShowFundSourceForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Fund Source
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {fundSources.map((source) => (
                      <FundSourceCard
                        key={source.id}
                        fundSource={source}
                        onEdit={handleEditFundSource}
                        onDelete={handleDeleteFundSource}
                        onView={handleViewFundSource}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="transactions" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">All Transactions</h2>
                  <Button 
                    onClick={() => setShowTransactionForm(true)}
                    disabled={fundSources.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                  </Button>
                </div>

                <FundTransactionList
                  transactions={transactions}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteTransaction}
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
      
      <Footer />

      {/* Fund Source Dialog */}
      <FundSourceDialog
        isOpen={showFundSourceForm}
        onClose={handleCancelForm}
        fundSource={editingFundSource || undefined}
        onSubmit={editingFundSource ? handleUpdateFundSource : handleCreateFundSource}
        isLoading={isSubmitting}
      />

      {/* Fund Transaction Dialog */}
      <FundTransactionDialog
        isOpen={showTransactionForm}
        onClose={handleCancelForm}
        transaction={editingTransaction || undefined}
        fundSources={fundSources}
        selectedFundSourceId={selectedFundSourceId}
        onSubmit={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}
        isLoading={isSubmitting}
      />
    </div>
  )
}
