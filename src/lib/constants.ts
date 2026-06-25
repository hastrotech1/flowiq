/**
 * App-wide constants for FlowIQ.
 * Centralised here so changes propagate everywhere automatically.
 */

// ── Appwrite resource IDs ──────────────────────────────────
// These are populated from environment variables at runtime.
// See .env.example for the full list of required variables.
export const APPWRITE_CONFIG = {
  endpoint:          import.meta.env.VITE_APPWRITE_ENDPOINT    as string,
  projectId:         import.meta.env.VITE_APPWRITE_PROJECT_ID  as string,
  databaseId:        import.meta.env.VITE_APPWRITE_DATABASE_ID as string,
  collections: {
    statements:      import.meta.env.VITE_APPWRITE_STATEMENTS_COLLECTION_ID  as string,
    transactions:    import.meta.env.VITE_APPWRITE_TRANSACTIONS_COLLECTION_ID as string,
  },
  buckets: {
    statements:      import.meta.env.VITE_APPWRITE_STATEMENTS_BUCKET_ID as string,
  },
  functions: {
    /** Appwrite Function that proxies requests to Anthropic API */
    aiProxy:         import.meta.env.VITE_APPWRITE_AI_PROXY_FUNCTION_ID as string,
  },
} as const

// ── Route paths ────────────────────────────────────────────
export const ROUTES = {
  auth:          '/auth',
  dashboard:     '/dashboard',
  statements:    '/statements',
  transactions:  '/transactions',
  categories:    '/categories',
  insights:      '/insights',
  reports:       '/reports',
  settings:      '/settings',
} as const

// ── Statement color tags ───────────────────────────────────
// Users assign a color tag when labelling a bank statement.
// Colors chosen to be distinct on both dark and light surfaces.
export const STATEMENT_COLORS = [
  { label: 'Green',   value: '#00A86B' },
  { label: 'Blue',    value: '#1E3A5F' },
  { label: 'Orange',  value: '#F97316' },
  { label: 'Purple',  value: '#8B5CF6' },
  { label: 'Pink',    value: '#EC4899' },
  { label: 'Cyan',    value: '#06B6D4' },
  { label: 'Yellow',  value: '#EAB308' },
  { label: 'Gray',    value: '#64748B' },
] as const

// ── Date filter presets ────────────────────────────────────
export const DATE_FILTER_PRESETS = [
  { label: 'Today',        value: 'today' },
  { label: 'This Week',    value: 'this_week' },
  { label: 'This Month',   value: 'this_month' },
  { label: 'Last Month',   value: 'last_month' },
  { label: 'Last 3 Months',value: 'last_3_months' },
  { label: 'Last 6 Months',value: 'last_6_months' },
  { label: 'This Year',    value: 'this_year' },
  { label: 'Custom Range', value: 'custom' },
] as const

// ── Pagination ─────────────────────────────────────────────
/** Max transactions fetched per Appwrite query page */
export const TRANSACTIONS_PAGE_SIZE = 100

/** Max transactions sent to AI agent in a single context window */
export const AI_CONTEXT_TRANSACTION_LIMIT = 500

// ── File upload limits ─────────────────────────────────────
/** 20 MB max file size for statement uploads */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

export const ACCEPTED_FILE_TYPES = {
  'application/pdf':                                          ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel':                                ['.xls'],
  'text/csv':                                                ['.csv'],
} as const

// ── Recurring expense detection ────────────────────────────
/** A narration seen this many times or more is considered recurring */
export const RECURRING_THRESHOLD = 3

/** Recurring transactions must be within this many days of each other */
export const RECURRING_INTERVAL_DAYS = 35

// ── AI model ───────────────────────────────────────────────
export const AI_MODEL = 'claude-sonnet-4-6' as const
