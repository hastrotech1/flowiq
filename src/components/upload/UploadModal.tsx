import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATEMENT_COLORS } from '@/lib/constants'
import DropZone from './DropZone'
import ColumnMapperUI from './ColumnMapperUI'
import { useStatements } from '@/hooks/useStatements'
import { useToast } from '@/components/ui/Toast'
import type { ColumnMapping } from '@/types'

// ════════════════════════════════════════════════════════════
// UPLOAD MODAL
// Multi-step modal that handles the full upload flow:
//   Step 1 — label + color tag + file selection
//   Step 2 — (conditional) ColumnMapperUI if format unknown
//   Step 3 — uploading/parsing progress
// ════════════════════════════════════════════════════════════

interface UploadModalProps {
  onClose: () => void
}

type Step = 'form' | 'mapping' | 'uploading'

/**
 * Full-screen modal (mobile sheet / centered dialog on desktop)
 * for uploading a new bank statement.
 *
 * Manages the multi-step flow:
 *   form → [mapping if needed] → uploading → done (close)
 */
export default function UploadModal({ onClose }: UploadModalProps) {
  const toast = useToast()
  const { uploadAndParse, completeWithMapping } = useStatements()

  // ── Form state ─────────────────────────────────────────
  const [step,     setStep]     = useState<Step>('form')
  const [file,     setFile]     = useState<File | null>(null)
  const [bankName, setBankName] = useState('')
  const [colorTag, setColorTag] = useState<string>(STATEMENT_COLORS[0].value)
  const [formError, setFormError] = useState<string | null>(null)

  // ── Mapping state (set when parser returns needsMapping=true) ──
  const [mappingData, setMappingData] = useState<{
    rawHeaders:      string[]
    rawGrid:         string[][]
    columnMapping:   ColumnMapping
    detectedBank:    string | null
    tempStatementId: string
  } | null>(null)

  // ── Submit form → start upload ──────────────────────────
  const handleSubmit = async () => {
    setFormError(null)
    if (!file)            return setFormError('Please select a file.')
    if (!bankName.trim()) return setFormError('Please enter a bank name or label.')

    setStep('uploading')
    try {
      const result = await uploadAndParse(file, bankName.trim(), colorTag)

      if (result.needsMapping) {
        // Parser needs user to confirm column mapping
        setMappingData({
          rawHeaders:      result.rawHeaders,
          rawGrid:         result.rawGrid,
          columnMapping:   result.columnMapping,
          detectedBank:    result.detectedBank,
          tempStatementId: result.tempStatementId,
        })
        setStep('mapping')
      } else {
        toast.success(`"${bankName}" imported successfully!`)
        onClose()
      }
    } catch (e) {
      setStep('form')
      toast.error(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    }
  }

  // ── Mapping confirmed → finalize ────────────────────────
  const handleMappingConfirm = async (mapping: ColumnMapping) => {
    if (!mappingData) return
    setStep('uploading')
    try {
      await completeWithMapping(
        mappingData.rawGrid,
        mapping,
        mappingData.tempStatementId,
      )
      toast.success(`"${bankName}" imported successfully!`)
      onClose()
    } catch (e) {
      setStep('mapping')
      toast.error(e instanceof Error ? e.message : 'Import failed. Please try again.')
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal panel — bottom sheet on mobile, centered dialog on desktop */}
      <div className={cn(
        'bg-white w-full lg:max-w-lg lg:rounded-card',
        'rounded-t-[20px] max-h-[92dvh] overflow-y-auto',
        'flex flex-col',
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface-border shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {step === 'mapping' ? 'Map Columns' : 'Upload Statement'}
          </h2>
          <button
            onClick={onClose}
            disabled={step === 'uploading'}
            className="p-1.5 rounded-btn text-gray-400 hover:text-gray-700 hover:bg-surface-muted transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* ── Step: form ── */}
          {step === 'form' && (
            <div className="flex flex-col gap-5">
              {/* Bank name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Bank / Account Label <span className="text-data-alert">*</span>
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. GTBank Savings, Kuda Main"
                  className={cn(
                    'h-11 px-3 rounded-input border text-sm bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-green-accent/30 focus:border-green-primary',
                    'placeholder:text-gray-400 transition-colors',
                    'border-surface-border',
                  )}
                  maxLength={40}
                />
              </div>

              {/* Color tag picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-800">Color Tag</label>
                <div className="flex flex-wrap gap-2">
                  {STATEMENT_COLORS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setColorTag(value)}
                      className={cn(
                        'w-8 h-8 rounded-chip border-2 transition-all',
                        colorTag === value
                          ? 'border-gray-800 scale-110'
                          : 'border-transparent hover:scale-105',
                      )}
                      style={{ backgroundColor: value }}
                      aria-label={`${label} color`}
                      aria-pressed={colorTag === value}
                    />
                  ))}
                </div>
              </div>

              {/* File drop zone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Statement File <span className="text-data-alert">*</span>
                </label>
                <DropZone onFile={setFile} />
              </div>

              {/* Form error */}
              {formError && (
                <p className="text-sm text-data-alert">{formError}</p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                className="w-full h-12 rounded-btn bg-green-primary text-white font-semibold text-sm hover:bg-green-deep transition-colors"
              >
                Upload & Import
              </button>
            </div>
          )}

          {/* ── Step: mapping ── */}
          {step === 'mapping' && mappingData && (
            <ColumnMapperUI
              rawHeaders={mappingData.rawHeaders}
              rawGrid={mappingData.rawGrid}
              initialMapping={mappingData.columnMapping}
              detectedBank={mappingData.detectedBank}
              onConfirm={handleMappingConfirm}
              onCancel={() => { setStep('form'); setMappingData(null) }}
            />
          )}

          {/* ── Step: uploading ── */}
          {step === 'uploading' && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <Loader2 size={36} className="text-green-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">Importing statement…</p>
                <p className="text-xs text-data-secondary mt-1">
                  Parsing transactions and running AI categorisation
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
