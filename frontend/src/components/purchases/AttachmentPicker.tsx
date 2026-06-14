import { FileText, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const ALLOWED_LABEL = 'PDF, JPG, PNG, or WEBP';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-500" />;
  return <FileText className="w-4 h-4 text-red-500" />;
}

export default function AttachmentPicker({ files, onChange, disabled, maxFiles = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateAndAdd(newFiles: FileList | File[]) {
    const arr = Array.from(newFiles);
    const errors: string[] = [];
    const validated: File[] = [];
    for (const f of arr) {
      if (!ALLOWED_MIME_TYPES.includes(f.type)) {
        errors.push(`${f.name}: unsupported type (${f.type || 'unknown'})`);
        continue;
      }
      if (f.size > MAX_SIZE_BYTES) {
        errors.push(`${f.name}: exceeds 10MB`);
        continue;
      }
      validated.push(f);
    }
    if (files.length + validated.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} attachments allowed.`);
      validated.splice(maxFiles - files.length);
    }
    setError(errors.length ? errors.join(' · ') : null);
    if (validated.length) onChange([...files, ...validated]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) validateAndAdd(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files.length) validateAndAdd(e.dataTransfer.files);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-400 hover:bg-primary-50/40'}
          ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}
        `}
      >
        <Upload className="w-6 h-6 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">
          Drag &amp; drop or <span className="text-primary-600 underline">click to browse</span>
        </p>
        <p className="text-xs text-gray-500">{ALLOWED_LABEL} · max 10MB · up to {maxFiles} files</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {files.length > 0 && (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
              {fileIcon(f.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{f.name}</p>
                <p className="text-xs text-gray-500">
                  {formatBytes(f.size)} · {f.type || 'unknown type'}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                disabled={disabled}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded disabled:opacity-50"
                aria-label="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
