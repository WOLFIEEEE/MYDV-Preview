import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DashboardSkeletonProps {
  showWelcomeHeader?: boolean;
  showMetricCards?: boolean;
  showQuickStats?: boolean;
  showCharts?: boolean;
}

export default function DashboardSkeleton({
  showWelcomeHeader = true,
  showMetricCards = true,
  showQuickStats = true,
  showCharts = true,
}: DashboardSkeletonProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="pt-16 pb-6">
        {/* Welcome Header Skeleton */}
        {showWelcomeHeader && (
          <section className="w-full">
            <div className="container mx-auto max-w-full px-4 lg:px-6 xl:px-8 py-4">
              <div className="w-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-black rounded-2xl shadow-xl border border-slate-600 dark:border-slate-700 mb-2">
                <div className="p-4 md:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 dark:border-white/20 animate-pulse">
                          <div className="w-7 h-7 bg-white/30 rounded"></div>
                        </div>
                        <div className="flex-1">
                          <div className="h-8 bg-white/20 rounded-lg mb-2 animate-pulse"></div>
                          <div className="h-5 bg-white/15 rounded-lg mb-3 animate-pulse"></div>
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-24 bg-white/20 rounded-full animate-pulse"></div>
                            <div className="h-6 w-20 bg-green-500/20 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                      <div className="h-10 w-32 bg-white/20 rounded-lg animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main Content Skeleton */}
        <section className="py-6 px-4 lg:px-6 xl:px-8">
          <div className="container mx-auto max-w-full">
            
            {/* Metric Cards Skeleton */}
            {showMetricCards && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Card key={index} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <CardContent className="p-3">
                      <div className="animate-pulse">
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                          <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quick Stats Skeleton */}
            {showQuickStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 animate-pulse">
                        <div className="w-6 h-6 bg-slate-300 dark:bg-slate-600 rounded"></div>
                        <div className="flex-1">
                          <div className="w-20 h-3 bg-slate-300 dark:bg-slate-600 rounded mb-1"></div>
                          <div className="w-16 h-5 bg-slate-300 dark:bg-slate-600 rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Charts Skeleton */}
            {showCharts && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                
                {/* Inventory Breakdown Chart Skeleton */}
                <Card className="xl:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div className="flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                        <div>
                          <div className="w-32 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div>
                          <div className="w-48 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                      </div>
                      <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4 animate-pulse">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="relative">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                              <div>
                                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div>
                                <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div>
                              <div className="w-12 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2"></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Inventory Status Chart Skeleton */}
                <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div className="flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                        <div>
                          <div className="w-28 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div>
                          <div className="w-36 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                      </div>
                      <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      {/* Donut Chart Skeleton */}
                      <div className="flex items-center justify-center mb-6">
                        <div className="relative w-40 h-40">
                          <div className="w-40 h-40 border-8 border-slate-200 dark:border-slate-700 rounded-full"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-8 h-5 bg-slate-300 dark:bg-slate-600 rounded mb-1"></div>
                                <div className="w-6 h-3 bg-slate-300 dark:bg-slate-600 rounded"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Legend Skeleton */}
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                              <div className="w-16 h-4 bg-slate-300 dark:bg-slate-600 rounded"></div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-4 bg-slate-300 dark:bg-slate-600 rounded"></div>
                                <div className="w-10 h-3 bg-slate-300 dark:bg-slate-600 rounded"></div>
                              </div>
                              <div className="w-12 h-3 bg-slate-300 dark:bg-slate-600 rounded"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Empty State Skeleton */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-12">
                <div className="text-center animate-pulse">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                  <div className="w-48 h-6 bg-slate-200 dark:bg-slate-700 rounded mx-auto mb-2"></div>
                  <div className="w-64 h-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto mb-6"></div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <div className="w-32 h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="w-28 h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
