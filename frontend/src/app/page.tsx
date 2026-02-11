"use client";

import ChatPanel from "@/components/ChatPanel";
import DataTable from "@/components/DataTable";
import DataUploader from "@/components/DataUploader";
import DocUploader from "@/components/DocUploader";
import { listDatasets, listDocuments } from "@/lib/api";
import type { DatasetMeta, DocListItem, DocUploadResponse, UploadDataResponse, UploadedFileInfo } from "@/lib/types";
import { useEffect, useState } from "react";

export default function Home() {
  const [datasets, setDatasets] = useState<UploadedFileInfo[]>([]);
  const [documents, setDocuments] = useState<DocListItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedDataset, setExpandedDataset] = useState<string | null>(null);

  useEffect(() => {
    listDatasets()
      .then((res) => {
        const initial: UploadedFileInfo[] = (res.datasets || []).map((d: DatasetMeta) => ({
          file_id: d.file_id,
          filename: d.filename,
          columns: d.columns,
          column_info: [],
          row_count: d.row_count,
          preview: [],
        }));
        setDatasets(initial);
      })
      .catch(() => {});
    listDocuments()
      .then((res) => setDocuments(res.documents || []))
      .catch(() => {});
  }, []);

  const handleDataUpload = (data: UploadDataResponse) => {
    setDatasets((prev) => {
      const newIds = new Set(data.files.map((f) => f.file_id));
      return [...prev.filter((d) => !newIds.has(d.file_id)), ...data.files];
    });
  };

  const handleDocUpload = (data: DocUploadResponse) => {
    setDocuments((prev) => [
      ...prev.filter((d) => d.doc_id !== data.doc_id),
      {
        doc_id: data.doc_id,
        name: data.filename,
        num_chunks: data.num_chunks,
      },
    ]);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* ── sidebar  */}
      <aside
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } transition-all duration-200 overflow-hidden border-r border-gray-200 dark:border-gray-800 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-lg font-bold flex items-center gap-2">
            🔬 Lab Co-Pilot
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Your AI lab assistant
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* data upload section */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Data Files
            </h3>
            <DataUploader onUpload={handleDataUpload} />
            {datasets.length > 0 && (
              <div className="mt-2 space-y-1">
                {datasets.map((d) => (
                  <div
                    key={d.file_id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedDataset(
                          expandedDataset === d.file_id ? null : d.file_id
                        )
                      }
                      className="w-full flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors px-2 py-1.5 text-left"
                    >
                      <span>📊</span>
                      <span className="truncate flex-1 font-medium">{d.filename}</span>
                      <span className="text-gray-400 shrink-0">
                        {d.row_count}r × {d.columns.length}c{" "}
                        {expandedDataset === d.file_id ? "▲" : "▼"}
                      </span>
                    </button>

                    {expandedDataset === d.file_id && (() => {
                      const totalNulls = d.column_info.reduce((s, c) => s + c.null_count, 0);
                      const totalCells = d.row_count * d.columns.length;
                      const completeness = totalCells > 0 ? ((1 - totalNulls / totalCells) * 100).toFixed(1) : "100.0";
                      const numericCols = d.column_info.filter(c => c.min != null || c.max != null || c.mean != null).length;
                      const textCols = d.columns.length - numericCols;

                      return (
                        <div className="border-t border-gray-200 dark:border-gray-700 text-xs">
                          {/* ── Table Stats Grid ── */}
                          <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700">
                            {[
                              { label: "Rows", value: d.row_count.toLocaleString(), icon: "📋" },
                              { label: "Columns", value: d.columns.length, icon: "📐" },
                              { label: "Numeric", value: numericCols, icon: "🔢" },
                              { label: "Text / Other", value: textCols, icon: "🔤" },
                              { label: "Missing Cells", value: totalNulls.toLocaleString(), icon: "⚠️" },
                              { label: "Completeness", value: `${completeness}%`, icon: "✅" },
                            ].map((stat) => (
                              <div
                                key={stat.label}
                                className="bg-white dark:bg-gray-900 px-2.5 py-2 flex items-center gap-2"
                              >
                                <span className="text-sm">{stat.icon}</span>
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">
                                    {stat.label}
                                  </p>
                                  <p className="font-semibold text-gray-800 dark:text-gray-200 leading-none">
                                    {stat.value}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* ── Numeric Column Ranges ── */}
                          {numericCols > 0 && (
                            <div className="px-3 pt-2 pb-1">
                              <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-1">
                                Numeric Ranges
                              </p>
                              <div className="space-y-1">
                                {d.column_info
                                  .filter(c => c.min != null || c.max != null || c.mean != null)
                                  .map((col) => (
                                    <div
                                      key={col.name}
                                      className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-800/40 rounded"
                                    >
                                      <span className="font-mono text-blue-600 dark:text-blue-400 truncate max-w-[45%]">
                                        {col.name}
                                      </span>
                                      <span className="ml-auto text-gray-400 tabular-nums whitespace-nowrap">
                                        {col.min != null && <span>{col.min}</span>}
                                        {col.min != null && col.max != null && <span> → </span>}
                                        {col.max != null && <span>{col.max}</span>}
                                        {col.mean != null && (
                                          <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">
                                            μ {col.mean.toFixed(2)}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* ── Null Warnings ── */}
                          {totalNulls > 0 && (
                            <div className="px-3 pt-2 pb-1">
                              <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-1">
                                Columns with Missing Data
                              </p>
                              <div className="space-y-0.5">
                                {d.column_info
                                  .filter(c => c.null_count > 0)
                                  .sort((a, b) => b.null_count - a.null_count)
                                  .map((col) => {
                                    const pct = ((col.null_count / d.row_count) * 100).toFixed(1);
                                    return (
                                      <div
                                        key={col.name}
                                        className="flex items-center gap-2 px-2 py-0.5"
                                      >
                                        <span className="font-mono text-amber-600 dark:text-amber-400 truncate max-w-[50%]">
                                          {col.name}
                                        </span>
                                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-amber-400 dark:bg-amber-500 rounded-full"
                                            style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                                          />
                                        </div>
                                        <span className="text-gray-400 tabular-nums whitespace-nowrap">
                                          {col.null_count.toLocaleString()} ({pct}%)
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* ── Preview ── */}
                          {d.preview.length > 0 && (
                            <div className="px-3 pt-2 pb-3">
                              <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-1">
                                Preview (first 5 rows)
                              </p>
                              <DataTable
                                data={d.preview}
                                columns={d.columns}
                                maxRows={5}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* document upload section */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Documents
            </h3>
            <DocUploader onUpload={handleDocUpload} />
            {documents.length > 0 && (
              <div className="mt-2 space-y-1">
                {documents.map((d) => (
                  <div
                    key={d.doc_id}
                    className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1"
                  >
                    <span>📄</span>
                    <span className="truncate flex-1">{d.name}</span>
                    <span className="text-gray-400">{d.num_chunks} chunks</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>

      {/* ── Main  */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* top bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="text-sm text-gray-400">
            {datasets.length > 0
              ? `Active: ${datasets[datasets.length - 1].filename}`
              : "No dataset loaded"}
          </span>
        </div>

        {/* chat panel */}
        <div className="flex-1 min-h-0">
          <ChatPanel />
        </div>
      </main>
    </div>
  );
}
