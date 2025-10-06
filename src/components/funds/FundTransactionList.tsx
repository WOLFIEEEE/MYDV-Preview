'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  PoundSterling,
  FileText,
  Hash
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FundTransaction } from '@/db/schema'

interface FundTransactionWithSource extends FundTransaction {
  fundSource?: {
    id: string
    fundName: string
  }
}

interface FundTransactionListProps {
  transactions: Array<{
    transaction: FundTransaction
    fundSource: {
      id: string
      fundName: string
    } | null
  }>
  onEdit: (transaction: FundTransaction) => void
  onDelete: (id: string) => void
  isLoading?: boolean
}

export function FundTransactionList({ 
  transactions, 
  onEdit, 
  onDelete, 
  isLoading 
}: FundTransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null)

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'usage':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'repayment':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'interest_payment':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(num)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date))
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'usage':
        return 'Usage'
      case 'repayment':
        return 'Repayment'
      case 'interest_payment':
        return 'Interest'
      default:
        return type
    }
  }

  // Filter and sort transactions
  const filteredAndSortedTransactions = transactions
    .filter(({ transaction, fundSource }) => {
      const matchesSearch = 
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fundSource?.fundName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = filterType === 'all' || transaction.transactionType === filterType
      const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus

      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.transaction.transactionDate).getTime() - new Date(b.transaction.transactionDate).getTime()
          break
        case 'amount':
          comparison = parseFloat(a.transaction.amount) - parseFloat(b.transaction.amount)
          break
        case 'type':
          comparison = a.transaction.transactionType.localeCompare(b.transaction.transactionType)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  const handleSort = (field: 'date' | 'amount' | 'type') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading transactions...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Fund Transactions</CardTitle>
          
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="usage">Usage</SelectItem>
                <SelectItem value="repayment">Repayment</SelectItem>
                <SelectItem value="interest_payment">Interest</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('date')}
              className={sortBy === 'date' ? 'bg-gray-100' : ''}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Date
              <ArrowUpDown className="h-3 w-3 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('amount')}
              className={sortBy === 'amount' ? 'bg-gray-100' : ''}
            >
              <PoundSterling className="h-4 w-4 mr-1" />
              Amount
              <ArrowUpDown className="h-3 w-3 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('type')}
              className={sortBy === 'type' ? 'bg-gray-100' : ''}
            >
              <FileText className="h-4 w-4 mr-1" />
              Type
              <ArrowUpDown className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {transactions.length === 0 
                ? 'No transactions found. Create your first transaction to get started.'
                : 'No transactions match your current filters.'
              }
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedTransactions.map(({ transaction, fundSource }) => (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getTransactionTypeColor(transaction.transactionType)}>
                          {getTransactionTypeLabel(transaction.transactionType)}
                        </Badge>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {fundSource?.fundName || 'Unknown Fund'}
                        </span>
                      </div>

                      {/* Amount and Date */}
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold">
                          {formatCurrency(transaction.amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(transaction.transactionDate)}
                        </div>
                      </div>

                      {/* Description */}
                      {transaction.description && (
                        <p className="text-sm text-muted-foreground">
                          {transaction.description}
                        </p>
                      )}

                      {/* Reference Number */}
                      {transaction.referenceNumber && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Hash className="h-3 w-3 mr-1" />
                          {transaction.referenceNumber}
                        </div>
                      )}

                      {/* Vehicle Stock ID */}
                      {transaction.vehicleStockId && (
                        <div className="flex items-center text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">
                            🚗 Vehicle: {transaction.vehicleStockId}
                          </span>
                        </div>
                      )}

                      {/* Due Date */}
                      {transaction.dueDate && (
                        <div className="text-sm text-muted-foreground">
                          Due: {formatDate(transaction.dueDate)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(transaction)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteTransactionId(transaction.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteTransactionId !== null} 
        onOpenChange={() => setDeleteTransactionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTransactionId) {
                  onDelete(deleteTransactionId)
                  setDeleteTransactionId(null)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
