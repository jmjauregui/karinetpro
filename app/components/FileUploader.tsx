"use client";

import { useState, useRef, useCallback } from "react";

interface FileUploaderProps {
  onFileLoaded: (data: ArrayBuffer, fileName: string) => void;
}

const ACCEPTED_EXTENSIONS = [".gp", ".gp3", ".gp4", ".gp5", ".gpx"];

function isValidFile(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function FileUploader({ onFileLoaded }: FileUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!isValidFile(file.name)) {
        setError(
          `Formato no soportado. Usa archivos: ${ACCEPTED_EXTENSIONS.join(", ")}`,
        );
        return;
      }

      const buffer = await file.arrayBuffer();
      onFileLoaded(buffer, file.name);
    },
    [onFileLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-xl">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-6 p-12
            rounded-2xl border-2 border-dashed cursor-pointer
            transition-all duration-200
            ${
              dragging
                ? "border-amber-400 bg-amber-400/5 scale-[1.02]"
                : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900/80"
            }
          `}
        >
          {/* Icon */}
          <div
            className={`transition-colors ${dragging ? "text-amber-400" : "text-zinc-600"}`}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-lg text-zinc-300 mb-1">
              Arrastra tu tablatura aqui
            </p>
            <p className="text-sm text-zinc-500">
              o haz click para seleccionar un archivo
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {ACCEPTED_EXTENSIONS.map((ext) => (
              <span
                key={ext}
                className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400 font-mono"
              >
                {ext}
              </span>
            ))}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Info */}
        <p className="mt-6 text-center text-xs text-zinc-600">
          El archivo se procesa localmente en tu navegador. No se sube a ningun servidor.
        </p>
      </div>
    </div>
  );
}
