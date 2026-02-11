"use client";

import { uploadData } from "@/lib/api";
import type { UploadDataResponse } from "@/lib/types";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onUpload?: (data: UploadDataResponse) => void;
}

export default function DataUploader({ onUpload }: Props) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      try {
        const data = await uploadData(file);
        setSuccessMsg(
          `✓ Loaded ${data.total_files} file${data.total_files > 1 ? "s" : ""} (${data.file_type.toUpperCase()})`
        );
        onUpload?.(data);
      } catch (err: unknown) {
        let msg = "Upload failed";
        if (err && typeof err === "object" && "response" in err) {
          const axErr = err as { response?: { data?: { detail?: string }; status?: number } };
          msg = axErr.response?.data?.detail || `Server error (${axErr.response?.status})`;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
    },
    maxFiles: 1,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
        }`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <p className="text-sm text-gray-500">Uploading…</p>
        ) : (
          <div>
            <p className="text-sm font-medium">
              📊 Drop CSV / Excel / ZIP here
            </p>
            <p className="text-xs text-gray-400 mt-1">
              or click to browse — ZIP extracts all CSVs inside
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {successMsg && <p className="text-xs text-green-600 font-medium">{successMsg}</p>}
    </div>
  );
}
