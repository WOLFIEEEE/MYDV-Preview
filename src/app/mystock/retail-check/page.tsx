"use client";

import { Suspense } from "react";
import EnhancedRetailCheck from "@/components/retail-check/EnhancedRetailCheck";

function RetailCheckLoading() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );
}

export default function RetailCheckPage() {
  return (
    <Suspense fallback={<RetailCheckLoading />}>
        <EnhancedRetailCheck />
    </Suspense>
  );
}