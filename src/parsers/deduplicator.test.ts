import { describe, expect, it } from 'vitest'
import {
  flagInterAccountTransfers,
  flagSelfTransfersByNarration,
} from '@/parsers/deduplicator'
import type { Transaction } from '@/types'

const tx = (
  id: string,
  statementId: string,
  date: string,
  amount: number,
  type: Transaction['type'],
  narration = 'Test',
): Transaction => ({
  id,
  statementId,
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

describe('flagInterAccountTransfers', () => {
  it('flags a debit/credit pair across two statements with same amount and close date', () => {
    const transactions = [
      tx('d1', 'stmt_A', '2024-01-10', 50000, 'debit'),
      tx('c1', 'stmt_B', '2024-01-10', 50000, 'credit'),
    ]
    const result = flagInterAccountTransfers(transactions)

    const debit  = result.find((t) => t.id === 'd1')!
    const credit = result.find((t) => t.id === 'c1')!

    expect(debit.isInterAccountTransfer).toBe(true)
    expect(debit.transferPairId).toBe('c1')
    expect(credit.isInterAccountTransfer).toBe(true)
    expect(credit.transferPairId).toBe('d1')
  })

  it('does NOT flag pairs within the same statement', () => {
    const transactions = [
      tx('d1', 'stmt_A', '2024-01-10', 50000, 'debit'),
      tx('c1', 'stmt_A', '2024-01-10', 50000, 'credit'),  // same statement
    ]
    const result = flagInterAccountTransfers(transactions)
    expect(result.every((t) => !t.isInterAccountTransfer)).toBe(true)
  })

  it('does NOT flag when there is only one statement', () => {
    const transactions = [
      tx('d1', 'stmt_A', '2024-01-10', 50000, 'debit'),
      tx('c1', 'stmt_A', '2024-01-10', 50000, 'credit'),
    ]
    const result = flagInterAccountTransfers(transactions)
    expect(result.every((t) => !t.isInterAccountTransfer)).toBe(true)
  })

  it('does NOT flag amounts differing by more than 2%', () => {
    const transactions = [
      tx('d1', 'stmt_A', '2024-01-10', 50000, 'debit'),
      tx('c1', 'stmt_B', '2024-01-10', 45000, 'credit'),  // 10% difference
    ]
    const result = flagInterAccountTransfers(transactions)
    expect(result.every((t) => !t.isInterAccountTransfer)).toBe(true)
  })

  it('does NOT flag pairs more than 3 days apart', () => {
    const transactions = [
      tx('d1', 'stmt_A', '2024-01-05', 50000, 'debit'),
      tx('c1', 'stmt_B', '2024-01-10', 50000, 'credit'),  // 5 days later
    ]
    const result = flagInterAccountTransfers(transactions)
    expect(result.every((t) => !t.isInterAccountTransfer)).toBe(true)
  })

  it('does not double-match a single credit against multiple debits', () => {
    const transactions = [
      tx('d1', 'stmt_A', '2024-01-10', 50000, 'debit'),
      tx('d2', 'stmt_A', '2024-01-10', 50000, 'debit'),
      tx('c1', 'stmt_B', '2024-01-10', 50000, 'credit'),
    ]
    const result = flagInterAccountTransfers(transactions)
    const flagged = result.filter((t) => t.isInterAccountTransfer)
    // Only ONE debit should match the single credit
    expect(flagged).toHaveLength(2)
  })
})

describe('flagSelfTransfersByNarration', () => {
  it('flags transactions with self-transfer narration patterns', () => {
    const transactions = [
      tx('1', 'stmt_A', '2024-01-01', 10000, 'debit', 'TRANSFER TO OWN ACCOUNT'),
      tx('2', 'stmt_A', '2024-01-01', 10000, 'debit', 'NIP/TRANSFER TO SELF'),
      tx('3', 'stmt_A', '2024-01-01',  5000, 'debit', 'AIRTIME PURCHASE'),
    ]
    const result = flagSelfTransfersByNarration(transactions)

    expect(result.find((t) => t.id === '1')!.isInterAccountTransfer).toBe(true)
    expect(result.find((t) => t.id === '2')!.isInterAccountTransfer).toBe(true)
    expect(result.find((t) => t.id === '3')!.isInterAccountTransfer).toBe(false)
  })
})
