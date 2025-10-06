'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Phone, 
  Mail, 
  MapPin,
  PoundSterling,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar
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
import { FundSource } from '@/db/schema'

interface FundSourceWithSummary extends FundSource {
  totalUsed?: number
  totalRepaid?: number
  outstandingAmount?: number
  availableAmount?: number
  utilizationPercentage?: number
  repaymentPercentage?: number
}

interface FundSourceCardProps {
  fundSource: FundSourceWithSummary
  onEdit: (fundSource: FundSource) => void
  onDelete: (id: string) => void
  onView: (fundSource: FundSource) => void
}

export function FundSourceCard({ 
  fundSource, 
  onEdit, 
  onDelete, 
  onView
}: FundSourceCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'closed':
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

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{fundSource.fundName}</CardTitle>
              <Badge className={getStatusColor(fundSource.status)}>
                {fundSource.status.charAt(0).toUpperCase() + fundSource.status.slice(1)}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(fundSource)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(fundSource)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Amount Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <PoundSterling className="h-4 w-4 mr-1" />
                Total Amount
              </div>
              <p className="font-semibold text-lg">
                {formatCurrency(fundSource.amount)}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 mr-1" />
                Available
              </div>
              <p className="font-semibold text-lg text-green-600">
                {formatCurrency(fundSource.availableAmount || 0)}
              </p>
            </div>
          </div>

          {/* Fund Usage Summary */}
          <div className="grid grid-cols-3 gap-3 py-3 border-t border-b">
            <div className="text-center">
              <div className="flex items-center justify-center text-xs text-muted-foreground mb-1">
                <TrendingDown className="h-3 w-3 mr-1" />
                Used
              </div>
              <p className="font-semibold text-sm text-red-600">
                {formatCurrency(fundSource.totalUsed || 0)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Repaid
              </div>
              <p className="font-semibold text-sm text-green-600">
                {formatCurrency(fundSource.totalRepaid || 0)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center text-xs text-muted-foreground mb-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                Outstanding
              </div>
              <p className="font-semibold text-sm text-orange-600">
                {formatCurrency(fundSource.outstandingAmount || 0)}
              </p>
            </div>
          </div>

          {/* Current Utilization Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current Utilization</span>
              <span>{(fundSource.utilizationPercentage || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(fundSource.utilizationPercentage || 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Outstanding amount vs total fund</p>
          </div>

          {/* Repayment Progress */}
          {(fundSource.totalUsed || 0) > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Repayment Progress</span>
                <span>{(fundSource.repaymentPercentage || 0).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(fundSource.repaymentPercentage || 0, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Contact Information */}
          {(fundSource.contactPersonName || fundSource.mobileNumber || fundSource.contactEmail) && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
              <div className="space-y-1">
                {fundSource.contactPersonName && (
                  <p className="text-sm">{fundSource.contactPersonName}</p>
                )}
                {fundSource.mobileNumber && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-3 w-3 mr-2" />
                    {fundSource.mobileNumber}
                  </div>
                )}
                {fundSource.contactEmail && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 mr-2" />
                    {fundSource.contactEmail}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Address */}
          {fundSource.address && (
            <div className="space-y-1 pt-2 border-t">
              <div className="flex items-start text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{fundSource.address}</span>
              </div>
            </div>
          )}

          {/* Interest Rate */}
          {fundSource.interestRate && (
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Interest Rate</span>
              <span className="font-medium">{fundSource.interestRate}%</span>
            </div>
          )}

          {/* Created Date */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Created
            </div>
            <span>{formatDate(fundSource.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fund Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fundSource.fundName}"? This action cannot be undone.
              All associated transactions will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(fundSource.id)
                setShowDeleteDialog(false)
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
