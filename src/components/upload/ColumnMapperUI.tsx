import { useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  COLUMN_FIELDS,
  validateColumnMapping,
  describeMappingSummary,
  createMappingDraft,
} from '@/parsers/columnMapper'
import type { ColumnMapping } from '@/types'

// ════════════════════════════════════════════════════════════
// PROPS
// ════════════════════════════════════════════════════════════

interface ColumnMapperUIProps {
  /** All column headers extracted from the uploaded file */
  rawHeaders:     string[]
  /** First few rows of data for the preview table */
  rawGrid:        string[][]
  /** Best-guess mapping from the heuristic detector (may be partial) */
  initialMapping: Partial<ColumnMapping>
  /** Bank name if partially detected */
  detectedBank:   string | null
  /** Called when the user confirms their mapping */
  onConfirm:      (mapping: ColumnMapping) => void
  /** Called if the user cancels and wants to re-upload */
  onCancel:       () => void
}

// ════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════

/**
 * Shown when the generic parser cannot confidently auto-detect the
 * column layout of an uploaded bank statement.
 *
 * The user sees:
 * 1. A data preview table (first few rows of their file)
 * 2. Dropdown rows for each column field (date, narration, amount, etc.)
 * 3. Pre-filled best guesses from the heuristic detector
 * 4. Validation errors before confirmation
 * 5. A summary of the confirmed mapping before final import
 */
export default function ColumnMapperUI({
  rawHeaders,
  rawGrid,
  initialMapping,
  detectedBank,
  onConfirm,
  onCancel,
}: ColumnMapperUIProps) {
  const [mapping, setMapping]   = useState<ColumnMapping>(createMappingDraft(initialMapping))
  const [errors,  setErrors]    = useState<string[]>([])
  const [step,    setStep]      = useState<'map' | 'confirm'>('map')

  /** Updates a single field in the mapping draft */
  const setField = (key: keyof ColumnMapping, value: string | null) => {
    setMapping((prev) => ({ ...prev, [key]: value || null }))
    setErrors([])
  }

  /** Validates and moves to the confirmation step */
  const handleNext = () => {
    const errs = validateColumnMapping(mapping, rawHeaders)
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setStep('confirm')
  }

  const summary = describeMappingSummary(mapping)

  // ── Preview rows (first 5 data rows) ────────────────────
  const previewHeaders = rawGrid[0] ?? []
  const previewRows    = rawGrid.slice(1, 6)

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-gray-900">
          Map Your Statement Columns
        </h2>
        <p className="text-sm text-gray-500">
          {detectedBank
            ? `We partially recognised this as a ${detectedBank} statement. Please confirm the column mapping below.`
            : "We couldn't automatically detect your bank's format. Please tell us which column is which."}
        </p>
      </div>

      {/* Data preview table */}
      <div className="rounded-card border border-surface-border overflow-x-auto bg-white">
        <p className="text-xs font-medium text-gray-400 px-3 pt-3 pb-2 uppercase tracking-wide">
          File Preview
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted">
              {previewHeaders.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, ri) => (
              <tr key={ri} className="border-b border-surface-border last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[140px] truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {step === 'map' && (
        <>
          {/* Column mapping fields */}
          <div className="flex flex-col gap-3">
            {COLUMN_FIELDS.map((field) => (
              <MappingRow
                key={field.key}
                field={field}
                headers={rawHeaders}
                value={(mapping[field.key] as string | null) ?? null}
                onChange={(val) => setField(field.key, val)}
              />
            ))}
          </div>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="rounded-btn bg-red-50 border border-red-200 p-3 flex gap-2">
              <AlertCircle className="text-data-alert shrink-0 mt-0.5" size={16} />
              <ul className="flex flex-col gap-1">
                {errors.map((e, i) => (
                  <li key={i} className="text-sm text-data-alert">{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Info callout */}
          <div className="rounded-btn bg-blue-50 border border-blue-100 p-3 flex gap-2">
            <Info className="text-data-primary shrink-0 mt-0.5" size={15} />
            <p className="text-xs text-data-primary leading-relaxed">
              <strong>Tip:</strong> Most Nigerian banks use either separate{' '}
              <em>Debit/Credit</em> columns, or a single <em>Amount</em> column
              with a <em>Dr/Cr</em> type column. Look at your file preview above
              to identify which applies.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-11 rounded-btn border border-surface-border text-sm font-medium text-gray-600 hover:bg-surface-muted transition-colors"
            >
              Cancel Upload
            </button>
            <button
              onClick={handleNext}
              className="flex-1 h-11 rounded-btn bg-green-primary text-white text-sm font-semibold hover:bg-green-deep transition-colors"
            >
              Preview Mapping
            </button>
          </div>
        </>
      )}

      {step === 'confirm' && (
        <>
          {/* Mapping summary */}
          <div className="rounded-card border border-green-primary/20 bg-green-subtle p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-green-primary" />
              <span className="text-sm font-semibold text-green-deep">Mapping Summary</span>
            </div>
            {summary.map((line, i) => (
              <p key={i} className="text-sm text-gray-700 font-mono">{line}</p>
            ))}
          </div>

          <p className="text-sm text-gray-500">
            Does this look correct? If yes, we'll import your transactions.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('map')}
              className="flex-1 h-11 rounded-btn border border-surface-border text-sm font-medium text-gray-600 hover:bg-surface-muted transition-colors"
            >
              Edit Mapping
            </button>
            <button
              onClick={() => onConfirm(mapping)}
              className="flex-1 h-11 rounded-btn bg-green-primary text-white text-sm font-semibold hover:bg-green-deep transition-colors"
            >
              Confirm & Import
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MAPPING ROW — single column field with dropdown
// ════════════════════════════════════════════════════════════

interface MappingRowProps {
  field:    typeof COLUMN_FIELDS[number]
  headers:  string[]
  value:    string | null
  onChange: (val: string | null) => void
}

/**
 * A single row in the column mapping form.
 * Renders a label, description, and a native select dropdown
 * populated with the file's actual column headers.
 */
function MappingRow({ field, headers, value, onChange }: MappingRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-gray-800">
          {field.label}
        </label>
        {field.required && (
          <span className="text-xs text-data-alert font-medium">Required</span>
        )}
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{field.description}</p>

      {/* Native select — reliable on mobile, no extra library needed */}
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className={cn(
            'w-full h-10 pl-3 pr-8 rounded-input border text-sm appearance-none bg-white',
            'focus:outline-none focus:ring-2 focus:ring-green-accent/30 focus:border-green-primary',
            'transition-colors',
            value
              ? 'border-green-primary/40 text-gray-800'
              : 'border-surface-border text-gray-400',
          )}
        >
          <option value="">
            {field.required ? '— Select a column —' : '— Not in this file —'}
          </option>
          {headers.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>
    </div>
  )
}
