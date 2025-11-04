import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that anyone can access
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/about',
  '/contact',
  '/features',
  '/pricing',
  '/guides',
  '/privacy',
  '/terms',
  '/cookies',
  '/join',
  '/accept-invitation',
  '/qr-upload(.*)'
]);

// Define routes that should be explicitly protected
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/dashboard-redirect',
  '/store-owner(.*)',
  '/inventory(.*)',
  '/mystock(.*)',
  '/invoice(.*)',
  '/invoices(.*)',
  '/invoice-pdf-editor(.*)',
  '/dynamic-invoice-editor(.*)',
  '/enterprise-invoice-editor(.*)',
  '/kanban(.*)',
  '/documents(.*)',
  '/notifications(.*)',
  '/vehicle-check(.*)',
  '/vehicle-finder(.*)',
  '/listings(.*)',
  '/stock-management(.*)',
  '/stock-actions(.*)',
  '/services(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes first
  if (isPublicRoute(req)) {
    return;
  }
  
  // Protect all protected routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  
  // Protect API routes (except public ones)
  if (req.nextUrl.pathname.startsWith('/api/')) {
    // Allow some public API endpoints if needed
    const publicApiRoutes = [
      '/api/webhooks',
      '/api/stock-images/upload', // Allow stock-images upload for QR code functionality
      '/api/vehicle-documents/upload', // Allow vehicle-documents upload for QR code functionality
      '/api/stock/', // Allow basic stock info for QR code functionality (covers /api/stock/[stockId]/basic-info)
      '/api/public/export' // Allow public export API with token authentication and rate limiting
    ];
    const isPublicApi = publicApiRoutes.some(route => req.nextUrl.pathname.startsWith(route));
    
    if (!isPublicApi) {
      await auth.protect();
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 