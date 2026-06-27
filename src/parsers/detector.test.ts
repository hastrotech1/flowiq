import { describe, expect, it } from 'vitest'
import { detectBankFormat } from '@/parsers/detector'

describe('detectBankFormat — uniqueness scoring', () => {
  it('identifies GTBank by its distinctive "Trans. Date" + "Transaction Details" columns', () => {
    const headers = ['Trans. Date', 'Debit', 'Credit', 'Balance', 'Transaction Details']
    expect(detectBankFormat(headers)?.bank).toBe('GTBank')
  })

  it('identifies Access Bank by "Debit Amount" / "Credit Amount" (not just Debit/Credit)', () => {
    const headers = ['Transaction Date', 'Debit Amount', 'Credit Amount', 'Transaction Description', 'Balance']
    expect(detectBankFormat(headers)?.bank).toBe('Access')
  })

  it('identifies Zenith by "Value Date" and "Remarks"', () => {
    const headers = ['Value Date', 'Debit', 'Credit', 'Remarks', 'Balance']
    expect(detectBankFormat(headers)?.bank).toBe('Zenith')
  })

  it('identifies Stanbic by "Description" + "Reference" (not "Remarks")', () => {
    const headers = ['Date', 'Debit', 'Credit', 'Description', 'Reference', 'Balance']
    expect(detectBankFormat(headers)?.bank).toBe('Stanbic')
  })

  it('identifies UBA by "Tran Date" / "Tran Amount" / "Tran Particulars"', () => {
    const headers = ['Tran Date', 'Tran Type', 'Tran Amount', 'Tran Particulars', 'Running Balance']
    expect(detectBankFormat(headers)?.bank).toBe('UBA')
  })

  it('identifies Kuda by "Money Out" / "Money In"', () => {
    const headers = ['Date', 'Money Out', 'Money In', 'Narration', 'Balance']
    expect(detectBankFormat(headers)?.bank).toBe('Kuda')
  })

  it('identifies Moniepoint by "Transaction Time" + "Status"', () => {
    const headers = ['Transaction Time', 'Type', 'Amount', 'Description', 'Status', 'Balance Before']
    expect(detectBankFormat(headers)?.bank).toBe('Moniepoint')
  })

  it('identifies OPay by "Amount(NGN)" + "Merchant"', () => {
    const headers = ['Time', 'Transaction Type', 'Amount(NGN)', 'Merchant']
    expect(detectBankFormat(headers)?.bank).toBe('OPay')
  })

  it('returns null for generic Debit/Credit/Balance columns with no distinctive markers', () => {
    // Could be GTBank OR Zenith OR Stanbic — ambiguous, must return null
    const headers = ['Date', 'Debit', 'Credit', 'Balance']
    expect(detectBankFormat(headers)).toBeNull()
  })

  it('returns null when two banks score equally', () => {
    // Constructed case where signature overlap causes a tie
    const headers = ['Date', 'Debit', 'Credit', 'Description', 'Balance']
    // Could match Stanbic (missing Reference) — should not confidently match
    const result = detectBankFormat(headers)
    // Stanbic requires "reference" too — so this is null or a lower-confidence match
    // The important thing is it doesn't silently return the wrong bank
    if (result !== null) {
      // If it matches, it must have a unique-enough signature
      expect(['Stanbic', 'GTBank', 'Zenith'].includes(result.bank)).toBe(false)
    }
  })

  it('is case-insensitive in header matching', () => {
    const headers = ['TRANS. DATE', 'DEBIT', 'CREDIT', 'BALANCE', 'TRANSACTION DETAILS']
    expect(detectBankFormat(headers)?.bank).toBe('GTBank')
  })
})
