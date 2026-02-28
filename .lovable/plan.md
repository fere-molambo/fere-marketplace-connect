

# Fix: Dashboard stuck in loading state (infinite query loop)

## Root cause
`getDateRange(period)` calls `new Date()` on every render, producing a new `startISO` millisecond value each time. This value is used as a React Query key. Combined with `staleTime: 0` and `gcTime: 0` in the global QueryClient config, each render triggers a new query (different key), which causes a re-render, which generates a new key — infinite loop. The dashboard never exits the loading skeleton state.

## Fix

### 1. Stabilize `PeriodSelector.getDateRange()` output
Round the `endDate` to the start of the current hour (or day) so the ISO string stays stable across renders within the same hour.

In `src/components/dashboard/PeriodSelector.tsx`:
- Change `const endDate = new Date()` to `const endDate = startOfDay(new Date())` (set to midnight today) or `startOfHour(new Date())`.
- This ensures `startISO` and `endISO` remain the same across renders for the same period selection.

### 2. Memoize date range in both dashboards
In `AdminDashboard.tsx` and `VendorDashboard.tsx`:
- Wrap `getDateRange(period)` in `useMemo(() => getDateRange(period), [period])` so the object reference and ISO strings stay stable when `period` hasn't changed.

### Files to edit
- `src/components/dashboard/PeriodSelector.tsx` — round endDate
- `src/components/dashboard/AdminDashboard.tsx` — useMemo for date range
- `src/components/dashboard/VendorDashboard.tsx` — useMemo for date range

