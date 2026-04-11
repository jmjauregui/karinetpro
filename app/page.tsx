"use client";

import { useState, useCallback } from "react";
import TabPlayer from "./components/TabPlayer";
import FileUploader from "./components/FileUploader";

interface LoadedFile {
  data: ArrayBuffer;
  name: string;
}

export default function Home() {
  const [file, setFile] = useState<LoadedFile | null>(null);

  const handleFileLoaded = useCallback((data: ArrayBuffer, name: string) => {
    setFile({ data, name });
  }, []);

  const handleClose = useCallback(() => {
    setFile(null);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={handleClose}
        >
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold text-sm">
            K
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Karinet<span className="text-amber-400">Pro</span>
          </h1>
        </div>
        <span className="text-xs text-zinc-600">v0.1.0</span>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 flex flex-col">
        {file ? (
          <TabPlayer
            fileData={file.data}
            fileName={file.name}
            onClose={handleClose}
          />
        ) : (
          <FileUploader onFileLoaded={handleFileLoaded} />
        )}
      </main>
    </div>
  );
}
