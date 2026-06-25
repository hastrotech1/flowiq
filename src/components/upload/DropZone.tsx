import { useRef, useState, useCallback } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateStatementFile } from '@/appwrite/storage'
import { ACCEPTED_FILE_TYPES } from '@/lib/constants'

// ════════════════════════════════════════════════════════════
// DROP ZONE — drag-and-drop + click file upload input
// ════════════════════════════════════════════════════════════

interface DropZoneProps {
  /** Called when a valid file is selected or dropped */
  onFile:     (file: File) => void
  /** Disable the zone while an upload is in progress */
  disabled?:  boolean
  className?: string
}

/**
 * File upload drop zone.
 * Supports drag-and-drop and click-to-browse.
 * Validates file type and size before calling onFile.
 * Shows selected file name with remove option before submission.
 */
export default function DropZone({ onFile, disabled, className }: DropZoneProps) {
  const inputRef              = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  /** Validates and stores a file, calling onFile if valid */
  const handleFile = useCallback((file: File) => {
    setError(null)
    const err = validateStatementFile(file)
    if (err) { setError(err); return }
    setSelected(file)
    onFile(file)
  }, [onFile])

  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); if (!disabled) setDragging(true) }
  const onDragLeave = ()                    => setDragging(false)
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  const clearFile = () => { setSelected(null); setError(null) }

  // Accept string for the <input> element
  const acceptAttr = Object.values(ACCEPTED_FILE_TYPES).flat().join(',')

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {selected ? (
        /* Selected file preview */
        <div className="flex items-center gap-3 p-3.5 rounded-card border border-green-primary/30 bg-green-subtle">
          <div className="w-9 h-9 rounded-btn bg-green-primary/10 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-green-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{selected.name}</p>
            <p className="text-xs text-data-secondary">
              {(selected.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          {!disabled && (
            <button
              onClick={clearFile}
              className="p-1.5 rounded-btn text-gray-400 hover:text-data-alert hover:bg-red-50 transition-colors"
              aria-label="Remove selected file"
            >
              <X size={15} />
            </button>
          )}
        </div>
      ) : (
        /* Drop zone */
        <button
          type="button"
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          disabled={disabled}
          className={cn(
            'w-full rounded-card border-2 border-dashed p-8',
            'flex flex-col items-center justify-center gap-3',
            'transition-colors duration-150 cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-accent/40',
            dragging
              ? 'border-green-primary bg-green-subtle'
              : 'border-surface-border bg-surface-muted/40 hover:border-green-primary/50 hover:bg-green-subtle/30',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          aria-label="Upload bank statement — click or drag and drop"
        >
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
            dragging ? 'bg-green-primary/20' : 'bg-surface-muted',
          )}>
            <Upload size={22} className={dragging ? 'text-green-primary' : 'text-data-secondary'} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {dragging ? 'Drop your file here' : 'Upload bank statement'}
            </p>
            <p className="text-xs text-data-secondary mt-1">
              PDF, Excel (.xlsx / .xls), or CSV — up to 20 MB
            </p>
          </div>
        </button>
      )}

      {/* Validation error */}
      {error && (
        <p className="text-xs text-data-alert px-1">{error}</p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        onChange={onInputChange}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  )
}
