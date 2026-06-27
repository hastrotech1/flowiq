import { describe, expect, it } from 'vitest'
import { applyFilters } from '@/analysis/aggregations'
import type { Transaction, TransactionFilters } from '@/types'

// ── Helpers ───────────────────────────────────────────────

const BASE_FILTERS: TransactionFilters = {
  datePreset:       null,
  dateFrom:         null,
  dateTo:           null,
  statementIds:     [],
  transactionType:  'all',
  narrationSearch:  '',
  category:         null,
  excludeTransfers: false,
}

const tx = (
  overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'date' | 'amount' | 'type'>,
): Transaction => ({
  statementId:           'stmt_1',
  userId:                'user_1',
  narration:             'Test narration',
  normalizedCategory:    null,
  balance:               null,
  isInterAccountTransfer: false,
  transferPairId:        null,
  createdAt:             overrides.date.toISOString(),
  ...overrides,
})

const JAN5  = new Date('2024-01-05T10:00:00Z')
const JAN10 = new Date('2024-01-10T10:00:00Z')
const FEB1  = new Date('2024-02-01T10:00:00Z')

const TRANSACTIONS: Transaction[] = [
  tx({ id: '1', date: JAN5,  amount: 1000, type: 'debit',  narration: 'Airtime MTN',     normalizedCategory: 'Airtime' }),
  tx({ id: '2', date: JAN10, amount: 2500, type: 'credit', narration: 'Salary payment' }),
  tx({ id: '3', date: FEB1,  amount: 500,  type: 'debit',  narration: 'Food & Dining',   normalizedCategory: 'Food' }),
  tx({ id: '4', date: JAN5,  amount: 300,  type: 'debit',  narration: 'Airtime Glo',     normalizedCategory: 'Airtime',
       isInterAccountTransfer: false,   statementId: 'stmt_2' }),
  tx({ id: '5', date: JAN5,  amount: 5000, type: 'debit',  narration: 'Own transfer',
       isInterAccountTransfer: true }),
]

describe('applyFilters', () => {
  it('returns all transactions when no filters are active', () => {
    expect(applyFilters(TRANSACTIONS, BASE_FILTERS)).toHaveLength(5)
  })

  it('filters by debit type', () => {
    const result = applyFilters(TRANSACTIONS, { ...BASE_FILTERS, transactionType: 'debit' })
    expect(result.every((t) => t.type === 'debit')).toBe(true)
    expect(result).toHaveLength(4)
  })

  it('filters by credit type', () => {
    const result = applyFilters(TRANSACTIONS, { ...BASE_FILTERS, transactionType: 'credit' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('narration search is case-insensitive and partial', () => {
    const result = applyFilters(TRANSACTIONS, { ...BASE_FILTERS, narrationSearch: 'airtime' })
    expect(result.map((t) => t.id).sort()).toEqual(['1', '4'])
  })

  it('excludes inter-account transfers when flag is set', () => {
    const result = applyFilters(TRANSACTIONS, { ...BASE_FILTERS, excludeTransfers: true })
    expect(result.find((t) => t.id === '5')).toBeUndefined()
    expect(result).toHaveLength(4)
  })

  it('filters by statementId', () => {
    const result = applyFilters(TRANSACTIONS, { ...BASE_FILTERS, statementIds: ['stmt_2'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('4')
  })

  it('filters by category', () => {
    const result = applyFilters(TRANSACTIONS, { ...BASE_FILTERS, category: 'Airtime' })
    expect(result.map((t) => t.id).sort()).toEqual(['1', '4'])
  })

  it('filters by custom date range', () => {
    const result = applyFilters(TRANSACTIONS, {
      ...BASE_FILTERS,
      datePreset: 'custom',
      dateFrom:   new Date('2024-01-01'),
      dateTo:     new Date('2024-01-31'),
    })
    expect(result.map((t) => t.id).sort()).toEqual(['1', '2', '4', '5'])
  })

  it('composes multiple filters (debit + narration search + date range)', () => {
    const result = applyFilters(TRANSACTIONS, {
      ...BASE_FILTERS,
      transactionType:  'debit',
      narrationSearch:  'airtime',
      datePreset:       'custom',
      dateFrom:         new Date('2024-01-01'),
      dateTo:           new Date('2024-01-31'),
    })
    expect(result.map((t) => t.id).sort()).toEqual(['1', '4'])
  })

  it('narration search returns zero results when nothing matches', () => {
    const result = applyFilters(TRANSACTIONS, {
      ...BASE_FILTERS,
      narrationSearch: 'zzz_no_match',
    })
    expect(result).toHaveLength(0)
  })
})
