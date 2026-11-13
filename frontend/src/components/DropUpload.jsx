import { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';

const ALLOWED = [
  'application/pdf', 'image/jpeg', 'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILES = 15;

export default function DropUpload({ onDone }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const addFiles = (incoming) => {
    setFiles(prev => [
      ...prev,
      ...Array.from(incoming)
        .filter(f => ALLOWED.includes(f.type))
        .slice(0, MAX_FILES - prev.length)
        .map(f => ({ file: f })),
    ]);
  };

  const remove = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const upload = async (e) => {
    e.stopPropagation();
    setUploading(true);
    const fd = new FormData();
    files.forEach(({ file }) => fd.append('files', file));
    try {
      const res = await fetch('/api/documents/upload-multi', { method: 'POST', body: fd });
      const data = await res.json();
      onDone?.(data.uploaded);
    } catch {
      // network error — caller can retry
    }
    setUploading(false);
  };

  return (
    <div
      onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      onDragOver={e => e.preventDefault()}
      onClick={() => inputRef.current.click()}
      className="border-2 border-dashed border-[hsl(var(--blue-300))] rounded-2xl p-8 text-center cursor-pointer hover:border-[hsl(var(--blue-700))] transition-colors"
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={e => addFiles(e.target.files)}
      />
      <Upload className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--blue-700))]/40" />
      <p className="text-[14px] text-muted-foreground">
        Drag & drop up to {MAX_FILES} files or click to browse
      </p>
      <p className="text-[12px] text-muted-foreground mt-1">
        PDF, JPG, PNG, DOC, DOCX — max 10 MB each
      </p>

      {files.length > 0 && (
        <ul className="mt-4 text-left space-y-1.5" onClick={e => e.stopPropagation()}>
          {files.map(({ file }, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-[hsl(var(--soft-bg))] px-3 py-2">
              <span className="flex items-center gap-2 text-[13px] text-[hsl(var(--blue-900))] truncate">
                <FileText className="w-4 h-4 shrink-0 text-[hsl(var(--blue-700))]" />
                {file.name}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => remove(i)} className="text-muted-foreground hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <button
          onClick={upload}
          disabled={uploading}
          className="mt-4 inline-flex items-center gap-2 bg-[hsl(var(--blue-700))] text-white text-[13px] font-bold px-5 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : `Upload ${files.length} file(s)`}
        </button>
      )}
    </div>
  );
}
