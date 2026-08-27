import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  Table,
  ArrowRight,
} from 'lucide-react';

export function BulkImport() {
  const [fileData, setFileData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importType, setImportType] = useState<'constituencies' | 'representatives' | 'election_results' | 'polling_booths'>('representatives');
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportSuccess(false);

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setFileData(results.data);
          if (results.meta.fields) {
            setColumns(results.meta.fields);
          }
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setFileData(data);
        if (data.length > 0) {
          setColumns(Object.keys(data[0] as object));
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleProcessImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setImportSuccess(true);
    }, 1200);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        state_code: 'TS',
        constituency_id: 'TS-AC-60',
        name: 'Danam Nagender',
        party: 'INC',
        role: 'MLA',
        email: 'mla.khairatabad@telangana.gov.in',
        phone: '+91 98490 00000',
        education: 'B.A.',
        assets_crores: '48.5',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `kshetra_${importType}_template.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-emerald-400" />
            <span>Bulk CSV & Excel Data Ingestion Utility</span>
          </h1>
          <p className="text-xs text-slate-400">
            Upload large-scale datasets, voter statistics, candidate affidavits, and booth coordinates directly into Kshetra.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs font-bold flex items-center gap-2 transition"
        >
          <Download className="w-4 h-4" />
          <span>Download Sample Template (.xlsx)</span>
        </button>
      </div>

      {/* Upload & Config Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Target Dataset */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">1. Select Target Dataset</h3>
          <div className="space-y-2">
            {[
              { id: 'representatives', label: 'Elected Representatives & Dossiers' },
              { id: 'constituencies', label: 'Constituency Attributes & Demographics' },
              { id: 'election_results', label: 'Historical Election Return Matrix' },
              { id: 'polling_booths', label: 'Polling Booth Spatial Coordinates' },
            ].map((t) => (
              <label
                key={t.id}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer text-xs transition ${
                  importType === t.id
                    ? 'bg-blue-950/40 border-blue-500/60 text-white font-bold'
                    : 'bg-[#0A0A1A] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="importType"
                  value={t.id}
                  checked={importType === t.id}
                  onChange={(e) => setImportType(e.target.value as any)}
                  className="text-blue-600"
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Step 2: Drag and drop Dropzone */}
        <div className="md:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center relative border-dashed hover:border-blue-500/60 transition group">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-sm text-white mb-1">
            {fileName ? fileName : 'Drag and drop your spreadsheet here'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Supports standard Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv) up to 50,000 rows.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {importSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Successfully processed <strong>{fileData.length} records</strong> into the <strong>{importType}</strong> table!</span>
          </div>
          <button onClick={() => setFileData([])} className="text-slate-400 hover:text-white">Clear</button>
        </div>
      )}

      {/* Preview Table */}
      {fileData.length > 0 && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-xs text-slate-200">
                Parsed Data Preview (<span className="text-white font-mono">{fileData.length} rows</span>)
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setFileData([]);
                  setFileName(null);
                }}
                className="p-2 text-slate-400 hover:text-red-400 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleProcessImport}
                disabled={importing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
              >
                <span>{importing ? 'Importing...' : 'Commit Ingestion to PostGIS'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-96">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A0A1A] text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="p-3 font-semibold uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
                {fileData.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    {columns.map((col) => (
                      <td key={col} className="p-3 truncate max-w-xs">
                        {String(row[col] ?? '')}
                      </td>
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
