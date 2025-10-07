# Stock Data Debug Logging Guide

## Overview
Comprehensive console logging has been added to debug the "No Stock Data Available" issue and check for race conditions between Clerk authentication and stock data fetching.

## 🚨 **See Issue? Start Here:**
👉 **[STOCK_DATA_ISSUE_DIAGNOSIS.md](./STOCK_DATA_ISSUE_DIAGNOSIS.md)** - Complete guide to diagnose and fix your specific issue with 4 identified ROOT CAUSES.

This document explains **what logs mean** and **how to read them**. The diagnosis guide tells you **what to do** based on what you find.

## What Was Added

### 1. **useOptimizedStockData Hook** (`src/hooks/useOptimizedStockData.ts`)

#### A. Clerk Auth State Logging
```javascript
🔐 ===== CLERK AUTH STATE (useOptimizedStockData) =====
```
**Logs:**
- `isLoaded` - Whether Clerk has finished loading
- `user exists` - Whether a user object is present
- `user.id` - The authenticated user's ID
- `userCacheId` - Generated cache key for this user
- `shouldExecuteQuery` - Whether the query should run
- `options.disabled` - If the query is disabled
- `Timestamp` - When this check occurred

**Purpose:** Identifies if Clerk auth is loaded before the query executes.

---

#### B. Cached Data Check
```javascript
📦 ===== CACHED DATA CHECK =====
```
**Logs:**
- `existingData found` - Whether cached data exists
- `existingData.stock length` - Number of cached stock items
- `lastRefresh` - When the cache was last refreshed

**Purpose:** Determines if cached data can be used while fetching fresh data.

---

#### C. Query Function Execution
```javascript
🚀 ===== QUERY FUNCTION EXECUTING =====
```
**Logs:**
- `Query started at` - Timestamp when the query function is called

**Purpose:** Confirms the query function actually runs (query is enabled).

---

#### D. API Fetch Request
```javascript
🚀 ===== OPTIMIZED STOCK FETCH =====
```
**Logs:**
- `Request URL` - Full API endpoint with query params

**Purpose:** Shows the exact API call being made.

---

#### E. API Response
```javascript
📦 ===== OPTIMIZED STOCK RESPONSE =====
```
**Logs:**
- `Response success` - Whether the API returned success
- `Stock items count` - Number of items received

**Purpose:** Confirms data was received from the API.

---

#### F. Loading State Updates
```javascript
🔄 ===== LOADING STATE UPDATE (useEffect) =====
```
**Logs:**
- `shouldExecuteQuery` - If query should run
- `query.isLoading` - Initial loading state
- `query.isFetching` - Fetching state
- `query.error` - Any error message
- `query.data exists` - If fresh data exists
- `existingData exists` - If cached data exists
- `query.status` - React Query status (pending/error/success)
- `query.fetchStatus` - React Query fetch status (idle/fetching/paused)

**Purpose:** Tracks how loading states change and why.

---

#### G. Hook Return Value
```javascript
📤 ===== HOOK RETURN VALUE =====
```
**Logs:**
- `data.length` - Number of stock items returned
- `loading` - Loading state
- `error` - Error message (if any)
- `loadingState` - Detailed loading state
- `pagination.totalResults` - Total results from API
- `cacheStatus.fromCache` - Whether data is from cache
- `isFetching` - If currently fetching

**Purpose:** Shows exactly what data the component receives.

---

### 2. **MyStock Page** (`src/app/mystock/page.tsx`)

#### A. Clerk Auth State Change Tracker
```javascript
🔐 ===== CLERK AUTH STATE CHANGE =====
```
**Logs:**
- `isLoaded changed to` - New Clerk loaded state
- `isSignedIn` - Whether user is signed in
- `user exists` - Whether user object exists
- `user.id` - User ID
- Warnings for auth issues

**Purpose:** Tracks when Clerk finishes loading and authenticates the user.

---

#### B. Component Data State
```javascript
🖥️ ===== MYSTOCK PAGE - DATA STATE =====
```
**Logs:**
- `Clerk isLoaded` - Clerk loading state
- `Clerk isSignedIn` - Sign-in state
- `Clerk user.id` - User ID
- `allStockData.length` - Number of stock items
- `loading` - Loading state
- `error` - Error message
- `loadingState` - Detailed state
- `apiPagination.totalResults` - Total results
- `cacheStatus.fromCache` - Cache status
- `isFetching` - Fetching status
- `queryOptions` - Query configuration

**Purpose:** Shows the complete data state in the component.

---

### 3. **API Route** (`src/app/api/stock/route.ts`)

#### A. Request Details
```javascript
🌐 ===== API ROUTE: STOCK LIST REQUEST =====
```
**Logs:**
- `Request received at` - Timestamp
- `Request URL` - Full URL
- `Request method` - HTTP method
- `Request headers` - Key headers

**Purpose:** Confirms when API requests arrive.

---

#### B. Clerk Auth Check
```javascript
🔐 ===== API ROUTE: CHECKING CLERK AUTH =====
```
**Logs:**
- `Before currentUser() call` - Timestamp before
- `After currentUser() call` - Timestamp after
- `User authenticated` - Success/failure
- `User ID` - Authenticated user ID

**Purpose:** Tracks Clerk auth timing on the server side.

---

## How to Use This Logging

### Step 1: Open Browser Console
Open your browser's Developer Tools (F12) and go to the Console tab.

### Step 2: Navigate to Stock Page
Go to the `/mystock` page where you see the "No Stock Data Available" error.

### Step 3: Analyze the Log Sequence

**Expected Flow (No Race Condition):**
1. ✅ Clerk loads (`isLoaded: true`)
2. ✅ User is authenticated (`user.id: [some-id]`)
3. ✅ Query is enabled (`shouldExecuteQuery: true`)
4. ✅ Query function executes
5. ✅ API request is made
6. ✅ API receives authenticated request
7. ✅ Data is returned
8. ✅ Component shows data

**Race Condition Scenario:**
1. ⚠️ Query attempts to run before Clerk loads
2. ⚠️ `isLoaded: false` or `user.id: undefined`
3. ⚠️ `shouldExecuteQuery: false`
4. ❌ Query never executes
5. ❌ No data is fetched

**Authentication Issue:**
1. ✅ Clerk loads
2. ❌ User is not authenticated
3. ⚠️ API returns 401 error
4. ❌ "User not authenticated" error shown

### Step 4: Identify the Issue

Look for these patterns:

#### **Pattern 1: Query Not Executing**
```
🔐 ===== CLERK AUTH STATE =====
👤 isLoaded: false
✅ shouldExecuteQuery: false
```
➜ **Issue:** Clerk hasn't loaded yet. Query is disabled.

#### **Pattern 2: No API Request**
```
📤 ===== HOOK RETURN VALUE =====
📊 data.length: 0
⏳ loading: false
❌ error: null
```
➜ **Issue:** Query didn't run, no error, but no data.

#### **Pattern 3: API Auth Failure**
```
🌐 ===== API ROUTE: STOCK LIST REQUEST =====
❌ API ROUTE: No user authenticated - returning 401
```
➜ **Issue:** Request reached API but user wasn't authenticated.

#### **Pattern 4: Empty Response**
```
📦 ===== OPTIMIZED STOCK RESPONSE =====
📊 Stock items count: 0
```
➜ **Issue:** API returned successfully but with no data.

---

## Common Issues and Solutions

### Issue 1: Race Condition
**Symptoms:**
- `shouldExecuteQuery: false` when it should be true
- Query never executes
- No API request is made

**Solution:**
The hook already waits for Clerk to load (`isLoaded && !!userCacheId`). If this still happens, check if there's an issue with Clerk configuration.

### Issue 2: Authentication Failure
**Symptoms:**
- API returns 401 errors
- User appears logged in on frontend but not on backend

**Solution:**
- Check Clerk middleware configuration
- Verify Clerk API keys match between frontend and backend
- Check if session cookies are being sent

### Issue 3: No Data from API
**Symptoms:**
- API authenticates successfully
- API returns empty array
- No store configuration or advertiser ID

**Solution:**
- Check store configuration in database
- Verify advertiser ID is set correctly
- Check AutoTrader API credentials

### Issue 4: Cached Data Not Showing
**Symptoms:**
- `existingData found: false` but should have cached data
- `fromCache: false` always

**Solution:**
- React Query cache might have been cleared
- User ID changed (different cache key)
- Cache expired (48 hours)

---

## Timestamps

All logs include timestamps to help identify timing issues:
```
⏰ Timestamp: 2025-10-07T10:30:45.123Z
```

Compare timestamps across different log blocks to see:
- How long Clerk takes to load
- How long API calls take
- If there are delays between auth and query execution

---

## Next Steps

1. **Capture the logs** - Copy all console output when the issue occurs
2. **Identify the pattern** - Match against the patterns above
3. **Share the logs** - Include them when contacting support
4. **Check timing** - Look for unusual delays between log blocks

---

## Disabling Debug Logging

Once the issue is resolved, you can:
1. Comment out the console.log statements
2. Or wrap them in a debug flag:
```javascript
const DEBUG = false;
if (DEBUG) console.log(...);
```

---

## Contact Support

When reporting this issue, include:
1. **Full console logs** - From page load to error
2. **Timestamp analysis** - Note any unusual delays
3. **Browser and OS** - What environment you're using
4. **Steps to reproduce** - How to trigger the issue

Email: admin@mydealershipview.com
