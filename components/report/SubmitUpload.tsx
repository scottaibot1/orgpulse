"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, CheckCircle, AlertCircle, FileText, X } from "lucide-react";

const LOADING_MESSAGES = [
  "Uploading file...",
  "Extracting content...",
  "Analyzing with AI...",
  "Almost done...",
];

const ACCEPTED = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md";
const MAX_SIZE_MB = 20;

interface Props {
  token: string;
  accentColor: string;
}

export default function SubmitUpload({ token, accentColor }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploading) { setLoadingMsgIdx(0); return; }
    const id = setInterval(() => {
      setLoadingMsgIdx((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 15000);
    return () => clearInterval(id);
  }, [uploading]);

  function handleFile(f: File) {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
    setError(null);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function submit() {
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`/api/submit/${token}`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? `Upload failed (${res.status}). Please try again.`);
        setUploading(false);
        return;
      }

      setSummary(data.summary ?? null);
      setDone(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: `${accentColor}18` }}
        >
          <CheckCircle className="h-8 w-8" style={{ color: accentColor }} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Report submitted!</h2>
        {summary && (
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">{summary}</p>
        )}
        <p className="text-xs text-gray-400 mt-4">You can close this page.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Upload your report</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Drop any file — PDF, Word, PowerPoint, Excel, or plain text.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
        }`}
        style={dragOver ? { borderColor: accentColor, background: `${accentColor}0a` } : {}}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={onInputChange}
        />
        {file ? (
          <div className="flex items-center gap-3 px-4 py-5">
            <FileText className="h-8 w-8 text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10">
            <Upload className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">Click or drag a file here</p>
            <p className="text-xs text-gray-400">PDF, DOCX, PPTX, XLSX, TXT · Max {MAX_SIZE_MB}MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2.5 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        disabled={!file || uploading}
        onClick={submit}
        className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ background: accentColor }}
      >
        {uploading ? "Processing report... this can take up to 90 seconds" : "Submit Report"}
      </button>

      {uploading && (
        <p className="text-xs text-center text-gray-400">
          {LOADING_MESSAGES[loadingMsgIdx]}
        </p>
      )}
    </div>
  );
}
