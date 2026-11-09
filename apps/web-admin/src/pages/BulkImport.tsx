import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { UploadCloud, FileSpreadsheet, Trash2, Table, AlertCircle } from 'lucide-react';

type PreviewRow = Record<string, unknown>;

export function BulkImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileData, setFileData] = useState<PreviewRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearPreview = () => {
    setFileData([]);
    setColumns([]);
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    setFileName(file.name);
    setFileData([]);
    setColumns([]);
    setError(null);

    if (extension !== 'csv' && extension !== 'xlsx' && extension !== 'xls') {
      setError('Choose a CSV, XLSX, or XLS file.');
      return;
    }

    setParsing(true);
    try {
      if (extension === 'csv') {
        Papa.parse<PreviewRow>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            setParsing(false);
            if (result.errors.length > 0) {
              setError(`Could not parse this CSV: ${result.errors[0].message}`);
              return;
            }
            const parsedColumns = result.meta.fields ?? [];
            if (parsedColumns.length === 0 || result.data.length === 0) {
              setError('The selected file has no header row or records to preview.');
              return;
            }
            setColumns(parsedColumns);
            setFileData(result.data);
          },
          error: (parseError) => {
            setParsing(false);
            setError(`Could not read this CSV: ${parseError.message}`);
          },
        });
        return;
      }

      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setError('The selected workbook has no worksheet to preview.');
        return;
      }

      const rows = XLSX.utils.sheet_to_json<PreviewRow>(workbook.Sheets[firstSheetName], { defval: '' });
      if (rows.length === 0) {
        setError('The selected worksheet has no records to preview.');
        return;
      }
      setColumns(Object.keys(rows[0]));
      setFileData(rows);
    } catch (parseError) {
      setError(parseError instanceof Error ? `Could not read this file: ${parseError.message}` : 'Could not read this file.');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-2">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-blue-400" />Dataset File Preview
        </h1>
        <p className="text-sm text-slate-300">Inspect CSV and Excel headers and records in this browser before preparing an import.</p>
      </div>

      <div role="note" className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 text-sm text-amber-200 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p>This portal has no connected dataset-import API. Files are parsed locally in your browser; this page does not upload them or write records to the database.</p>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center relative border-dashed hover:border-blue-500/60 transition group">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(event) => void handleFileUpload(event)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label="Choose a CSV or Excel file to preview"
        />
        <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <h2 className="font-bold text-sm text-white mb-1">
          {parsing ? 'Reading file…' : fileName ?? 'Choose a CSV, XLSX, or XLS file'}
        </h2>
        <p className="text-xs text-slate-400 max-w-sm">Only the first worksheet is previewed for Excel workbooks. No import or database write is available here.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-300 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button onClick={clearPreview} className="shrink-0 rounded-lg px-3 py-2 text-xs text-red-200 hover:bg-red-900/40">Clear and choose again</button>
        </div>
      )}

      {fileData.length > 0 && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <Table className="w-4 h-4 text-blue-400" />
              <span><strong className="font-mono">{fileData.length}</strong> parsed records · showing up to 50</span>
            </div>
            <button onClick={clearPreview} className="px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" />Clear preview
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-96">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A0A1A] text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>{columns.map((column) => <th key={column} className="p-3 font-semibold uppercase tracking-wider">{column}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
                {fileData.slice(0, 50).map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-slate-800/40 transition">
                    {columns.map((column) => (
                      <td key={column} className="p-3 truncate max-w-xs">{String(row[column] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
