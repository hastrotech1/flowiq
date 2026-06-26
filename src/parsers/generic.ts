import * as XLSX from 'xlsx'
import type { RawTransaction, ColumnMapping } from '@/types'
import { detectBankFormat, findHeader, type BankFormat } from './detector'

// ── PDF import — loaded lazily to avoid bundling the heavy worker upfront
// pdfjs-dist is only needed when the user actually uploads a PDF
let pdfjsLib: typeof import('pdfjs-dist') | null = null

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
    // Point the worker at the CDN copy so Vite doesn't bundle it
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
  }
  return pdfjsLib
}

// ════════════════════════════════════════════════════════════
// PUBLIC PARSE RESULT TYPE
// ════════════════════════════════════════════════════════════

export interface GenericParseResult {
  rows:          RawTransaction[]
  columnMapping: ColumnMapping
  detectedBank:  string | null
  /** True if we auto-detected the format; false if we need user confirmation */
  needsMapping:  boolean
  /** Raw headers extracted from the file (used to drive column mapper UI) */
  rawHeaders:    string[]
  /** Raw 2D data grid (rows × cols) as strings — for the mapper preview */
  rawGrid:       string[][]
}

// ════════════════════════════════════════════════════════════
// ENTRY POINT
// ════════════════════════════════════════════════════════════

/**
 * Main entry point for the parser layer.
 * Routes to the correct sub-parser based on file MIME type / extension,
 * then attempts bank format detection followed by row extraction.
 *
 * @param file - The File object from the drag-drop / file input
 * @returns GenericParseResult with rows + detected mapping
 */
export async function parseStatementFile(file: File): Promise<GenericParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (file.type === 'application/pdf' || ext === 'pdf') {
    return parsePDF(file)
  }

  // Excel and CSV both go through SheetJS
  return parseSpreadsheet(file)
}

// ════════════════════════════════════════════════════════════
// SPREADSHEET PARSER  (XLSX / XLS / CSV)
// ════════════════════════════════════════════════════════════

/**
 * Parses an Excel or CSV file using SheetJS.
 * Converts the first sheet to a 2D string grid, detects headers,
 * then maps rows using the detected (or heuristic) column layout.
 */
async function parseSpreadsheet(file: File): Promise<GenericParseResult> {
  const buffer   = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, {
    type:        'array',
    cellDates:   false,    // keep dates as raw strings — we parse them ourselves
    cellText:    true,     // force everything to string
    raw:         false,
  })

  // Use the first sheet
  const sheetName = workbook.SheetNames[0]
  const sheet     = workbook.Sheets[sheetName]

  // Convert to 2D array of strings
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header:   1,
    defval:   '',
    raw:      false,
  }) as string[][]

  return extractFromGrid(raw)
}

// ════════════════════════════════════════════════════════════
// PDF PARSER
// ════════════════════════════════════════════════════════════

/**
 * Extracts text from a PDF using pdfjs-dist, then reconstructs
 * a 2D grid by grouping text items by their vertical (y) position.
 * This handles the columnar layout of most bank statement PDFs.
 */
async function parsePDF(file: File): Promise<GenericParseResult> {
  const pdfjs  = await getPdfJs()
  const buffer = await file.arrayBuffer()

  const pdf = await pdfjs.getDocument({ data: buffer }).promise

  // Collect all text items with their positions across all pages
  interface TextItem { x: number; y: number; page: number; text: string }
  const items: TextItem[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page    = await pdf.getPage(pageNum)
    const content = await page.getTextContent()

    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        const transform = item.transform as number[]
        items.push({
          x:    Math.round(transform[4]),
          y:    Math.round(transform[5]),
          page: pageNum,
          text: item.str.trim(),
        })
      }
    }
  }

  // Group items into rows by (page, y) proximity
  const grid = groupPdfItemsIntoRows(items)

  return extractFromGrid(grid)
}

/**
 * Groups PDF text items into rows by their vertical (y) coordinate.
 * Items within Y_TOLERANCE pixels of each other are considered the same row.
 * Within each row, items are sorted left-to-right by x coordinate.
 */
function groupPdfItemsIntoRows(
  items: { x: number; y: number; page: number; text: string }[]
): string[][] {
  const Y_TOLERANCE = 4

  // Sort by page, then by descending y (PDF y=0 is bottom), then by x
  const sorted = [...items].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page
    if (Math.abs(a.y - b.y) > Y_TOLERANCE) return b.y - a.y  // top-to-bottom
    return a.x - b.x  // left-to-right within the same row
  })

  const rows: string[][] = []
  let   currentRow: { y: number; page: number; cells: string[] } | null = null

  for (const item of sorted) {
    const sameRow =
      currentRow !== null &&
      currentRow.page === item.page &&
      Math.abs(currentRow.y - item.y) <= Y_TOLERANCE

    if (sameRow) {
      currentRow!.cells.push(item.text)
    } else {
      if (currentRow) rows.push(currentRow.cells)
      currentRow = { y: item.y, page: item.page, cells: [item.text] }
    }
  }

  if (currentRow) rows.push(currentRow.cells)

  // Filter out rows with fewer than 2 cells (likely headers/footers)
  return rows.filter((r) => r.length >= 2)
}

// ════════════════════════════════════════════════════════════
// GRID → STRUCTURED ROWS
// ════════════════════════════════════════════════════════════

/**
 * Takes a 2D string grid (from spreadsheet or PDF) and:
 * 1. Finds the header row (first row with recognisable column names)
 * 2. Attempts bank format detection
 * 3. Falls back to heuristic column detection if bank is unknown
 * 4. Extracts RawTransaction[] from all data rows
 */
function extractFromGrid(grid: string[][]): GenericParseResult {
  // Find the header row — skip blank leading rows and bank letterheads
  const headerRowIdx = findHeaderRow(grid)

  if (headerRowIdx === -1) {
    // Could not find a valid header row — need user to map columns manually
    return {
      rows:          [],
      columnMapping: emptyMapping(),
      detectedBank:  null,
      needsMapping:  true,
      rawHeaders:    grid[0] ?? [],
      rawGrid:       grid.slice(0, 10),
    }
  }

  const headers  = grid[headerRowIdx].map((h) => String(h).trim())
  const dataRows = grid.slice(headerRowIdx + 1)

  // Try bank format detection first
  const bankFormat = detectBankFormat(headers)

  if (bankFormat) {
    const mapping = bankFormatToColumnMapping(bankFormat, headers)
    const rows    = extractRows(dataRows, headers, mapping)
    return {
      rows,
      columnMapping: mapping,
      detectedBank:  bankFormat.bank,
      needsMapping:  false,
      rawHeaders:    headers,
      rawGrid:       grid.slice(headerRowIdx, headerRowIdx + 6),
    }
  }

  // Heuristic detection — try to infer columns from header names
  const heuristic = inferColumnMapping(headers)

  if (heuristic.confidence === 'high') {
    const rows = extractRows(dataRows, headers, heuristic.mapping)
    return {
      rows,
      columnMapping: heuristic.mapping,
      detectedBank:  null,
      needsMapping:  false,
      rawHeaders:    headers,
      rawGrid:       grid.slice(headerRowIdx, headerRowIdx + 6),
    }
  }

  // Low confidence — let user map manually
  return {
    rows:          [],
    columnMapping: heuristic.mapping,  // pre-fill best guesses
    detectedBank:  null,
    needsMapping:  true,
    rawHeaders:    headers,
    rawGrid:       grid.slice(headerRowIdx, headerRowIdx + 10),
  }
}

/**
 * Scans the grid to find the row index that looks like a header row.
 * A header row is one where most cells are non-numeric strings.
 * Skips blank rows and rows that look like bank address/title text.
 */
function findHeaderRow(grid: string[][]): number {
  // Keywords that strongly indicate a header row
  const HEADER_KEYWORDS = [
    'date', 'amount', 'debit', 'credit', 'balance', 'narration',
    'description', 'details', 'transaction', 'remarks', 'particulars',
    'reference', 'dr', 'cr', 'type', 'note',
  ]

  for (let i = 0; i < Math.min(grid.length, 20); i++) {
    const row = grid[i].map((c) => String(c).toLowerCase().trim())
    if (row.length < 2) continue

    const keywordMatches = row.filter((cell) =>
      HEADER_KEYWORDS.some((kw) => cell.includes(kw))
    ).length

    // Needs at least 2 keyword matches to be considered a header
    if (keywordMatches >= 2) return i
  }

  return -1
}

/**
 * Heuristically infers column roles from header names.
 * Returns a confidence level alongside the mapping so the caller
 * can decide whether to proceed without user confirmation.
 */
function inferColumnMapping(headers: string[]): {
  mapping:    ColumnMapping
  confidence: 'high' | 'low'
} {
  const h = headers.map((s) => s.toLowerCase().trim())

  // Helper: find first header matching any of the given keywords
  const find = (...keywords: string[]) =>
    headers.find((_, i) => keywords.some((kw) => h[i].includes(kw))) ?? null

  const dateCol     = find('date', 'time', 'trans. date', 'value date', 'posting date')
  const narrationCol = find('narration', 'description', 'details', 'remarks', 'particulars', 'merchant', 'note')
  const debitCol    = find('debit', 'dr', 'money out', 'withdrawal')
  const creditCol   = find('credit', 'cr', 'money in', 'deposit')
  const amountCol   = find('amount', 'tran amount')
  const typeCol     = find('type', 'dr/cr', 'tran type', 'transaction type')
  const balanceCol  = find('balance', 'running balance', 'available balance')

  const hasSplit  = debitCol !== null && creditCol !== null
  const hasAmount = amountCol !== null

  const mapping: ColumnMapping = {
    date:      dateCol      ?? headers[0],
    narration: narrationCol ?? headers[headers.length - 1],
    amount:    hasSplit ? null : (amountCol ?? null),
    type:      hasSplit ? null : (typeCol ?? null),
    debitCol:  hasSplit ? debitCol : null,
    creditCol: hasSplit ? creditCol : null,
    balance:   balanceCol,
  }

  // High confidence if we have date + narration + (split cols OR amount+type)
  const confident =
    dateCol !== null &&
    narrationCol !== null &&
    (hasSplit || (hasAmount && typeCol !== null) || hasAmount)

  return { mapping, confidence: confident ? 'high' : 'low' }
}

/**
 * Converts a detected BankFormat into a ColumnMapping,
 * resolving the actual header string from the file's headers array.
 * This handles minor casing/spacing variations between statement exports.
 */
function bankFormatToColumnMapping(format: BankFormat, headers: string[]): ColumnMapping {
  const resolve = (target: string | null) =>
    target ? (findHeader(headers, target) ?? target) : null

  return {
    date:      resolve(format.dateCol)      ?? format.dateCol,
    amount:    resolve(format.amountCol),
    debitCol:  resolve(format.debitCol),
    creditCol: resolve(format.creditCol),
    type:      resolve(format.typeCol),
    narration: resolve(format.narrationCol) ?? format.narrationCol,
    balance:   resolve(format.balanceCol),
  }
}

/**
 * Extracts RawTransaction rows from a data grid using the resolved column mapping.
 * Skips empty rows and rows that look like sub-totals or page separators.
 */
function extractRows(
  rows:    string[][],
  headers: string[],
  mapping: ColumnMapping,
): RawTransaction[] {
  const result: RawTransaction[] = []

  // Build a header → column index lookup
  const idx = (col: string | null): number => {
    if (!col) return -1
    return headers.findIndex((h) => h.toLowerCase().trim() === col.toLowerCase().trim())
  }

  const dateIdx      = idx(mapping.date)
  const narrationIdx = idx(mapping.narration)
  const amountIdx    = idx(mapping.amount)
  const typeIdx      = idx(mapping.type)
  const debitIdx     = idx(mapping.debitCol)
  const creditIdx    = idx(mapping.creditCol)
  const balanceIdx   = idx(mapping.balance)

  for (const row of rows) {
    const cell = (i: number) => (i >= 0 ? String(row[i] ?? '').trim() : '')

    const dateVal  = cell(dateIdx)
    const narr     = cell(narrationIdx)

    // Skip completely empty rows and sub-total/summary rows
    if (!dateVal && !narr) continue
    if (isSubtotalRow(row)) continue

    // Resolve amount: either from split debit/credit cols or single amount col
    let amount: string
    let type: string

    if (debitIdx >= 0 && creditIdx >= 0) {
      const debitVal  = cell(debitIdx).replace(/[,\s]/g, '')
      const creditVal = cell(creditIdx).replace(/[,\s]/g, '')

      if (debitVal && parseFloat(debitVal) > 0) {
        amount = debitVal
        type   = 'Dr'
      } else if (creditVal && parseFloat(creditVal) > 0) {
        amount = creditVal
        type   = 'Cr'
      } else {
        continue  // both empty — skip this row
      }
    } else {
      amount = cell(amountIdx).replace(/[,\s]/g, '')
      type   = cell(typeIdx)
    }

    if (!amount || isNaN(parseFloat(amount))) continue

    result.push({
      date:      dateVal,
      amount,
      type,
      narration: narr,
      balance:   cell(balanceIdx) || null,
    })
  }

  return result
}

/**
 * Detects rows that are sub-totals, page breaks, or summary lines
 * that should not be treated as transactions.
 */
function isSubtotalRow(row: string[]): boolean {
  const joined = row.join(' ').toLowerCase()
  return (
    joined.includes('total') ||
    joined.includes('page total') ||
    joined.includes('brought forward') ||
    joined.includes('carried forward') ||
    joined.includes('opening balance') ||
    joined.includes('closing balance') ||
    (row.filter(Boolean).length === 1)  // only one non-empty cell
  )
}

function emptyMapping(): ColumnMapping {
  return {
    date:      '',
    amount:    null,
    debitCol:  null,
    creditCol: null,
    type:      null,
    narration: '',
    balance:   null,
  }
}

// ════════════════════════════════════════════════════════════
// PUBLIC EXPORT — used by parsers/index.ts after user confirms
// column mapping in the ColumnMapperUI
// ════════════════════════════════════════════════════════════

/**
 * Builds RawTransaction[] from a raw 2D grid using a user-confirmed
 * ColumnMapping. Called by runNormalizationFromMapping() in index.ts
 * after the user manually maps columns in the ColumnMapperUI.
 *
 * The first row of rawGrid is treated as the header row.
 *
 * @param rawGrid - The 2D string grid stored during the initial parse
 * @param mapping - User-confirmed ColumnMapping from the UI
 */
export function buildRawRowsFromGrid(
  rawGrid: string[][],
  mapping: ColumnMapping,
): import('@/types').RawTransaction[] {
  if (rawGrid.length < 2) return []

  const headers  = rawGrid[0].map((h) => String(h).trim())
  const dataRows = rawGrid.slice(1)

  return extractRows(dataRows, headers, mapping)
}
