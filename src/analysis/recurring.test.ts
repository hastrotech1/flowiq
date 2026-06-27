import { describe, expect, it } from 'vitest'
import { detectRecurringExpenses, getOneTimeExpenses } from '@/analysis/recurring'
import type { Transaction } from '@/types'

const tx = (
  id: string,
  date: string,
  amount: number,
  narration: string,
  type: Transaction['type'] = 'debit',
): Transaction => ({
  id,
  statementId:           'stmt_1',
  userId:                'user_1',
  date:                  new Date(date),
  amount,
  type,
  narration,
  normalizedCategory:    null,
  balance:               null,
  isInterAccountTransfer: false,
  transferPairId:        null,
  createdAt:             date,
})

describe('detectRecurringExpenses', () => {
  it('detects a narration that appears 3+ times within 35-day intervals as recurring', () => {
    const transactions = [
      tx('1', '2024-01-01', 2000, 'MTN AIRTIME RECHARGE'),
      tx('2', '2024-02-01', 2000, 'MTN AIRTIME RECHARGE'),
      tx('3', '2024-03-01', 2000, 'MTN AIRTIME RECHARGE'),
      tx('4', '2024-01-15', 5000, 'ONE TIME VENDOR'),   // not recurring
    ]
    const recurring = detectRecurringExpenses(transactions)

    expect(recurring).toHaveLength(1)
    expect(recurring[0].narration).toContain('AIRTIME')
    expect(recurring[0].occurrences).toBe(3)
    expect(recurring[0].averageAmount).toBe(2000)
  })

  it('does not flag narrations appearing fewer than 3 times', () => {
    const transactions = [
      tx('1', '2024-01-01', 5000, 'ONCE OFF TRANSFER'),
      tx('2', '2024-02-01', 5000, 'ONCE OFF TRANSFER'),
    ]
    expect(detectRecurringExpenses(transactions)).toHaveLength(0)
  })

  it('does not flag narrations with intervals > 35 days', () => {
    const transactions = [
      tx('1', '2024-01-01', 1000, 'QUARTERLY PAYMENT'),
      tx('2', '2024-04-01', 1000, 'QUARTERLY PAYMENT'),   // ~90 days apart
      tx('3', '2024-07-01', 1000, 'QUARTERLY PAYMENT'),
    ]
    expect(detectRecurringExpenses(transactions)).toHaveLength(0)
  })

  it('ignores credit transactions — only debits are considered', () => {
    const transactions = [
      tx('1', '2024-01-01', 50000, 'SALARY', 'credit'),
      tx('2', '2024-02-01', 50000, 'SALARY', 'credit'),
      tx('3', '2024-03-01', 50000, 'SALARY', 'credit'),
    ]
    expect(detectRecurringExpenses(transactions)).toHaveLength(0)
  })

  it('sorts results by totalAmount descending', () => {
    const transactions = [
      tx('1', '2024-01-01', 500,  'SMALL ITEM'),
      tx('2', '2024-02-01', 500,  'SMALL ITEM'),
      tx('3', '2024-03-01', 500,  'SMALL ITEM'),
      tx('4', '2024-01-01', 5000, 'BIG ITEM'),
      tx('5', '2024-02-01', 5000, 'BIG ITEM'),
      tx('6', '2024-03-01', 5000, 'BIG ITEM'),
    ]
    const recurring = detectRecurringExpenses(transactions)
    expect(recurring[0].totalAmount).toBeGreaterThan(recurring[1].totalAmount)
  })
})

describe('getOneTimeExpenses', () => {
  it('returns debits not included in the recurring set', () => {
    const recurring_tx  = [
      tx('1', '2024-01-01', 2000, 'AIRTIME'),
      tx('2', '2024-02-01', 2000, 'AIRTIME'),
      tx('3', '2024-03-01', 2000, 'AIRTIME'),
    ]
    const one_time = tx('4', '2024-01-15', 99000, 'LAPTOP PURCHASE')
    const all      = [...recurring_tx, one_time]
    const recurring = detectRecurringExpenses(all)
    const oneTime   = getOneTimeExpenses(all, recurring)

    expect(oneTime).toHaveLength(1)
    expect(oneTime[0].id).toBe('4')
  })
})
