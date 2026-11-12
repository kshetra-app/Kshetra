import React from 'react';
import { AlertCircle, FlaskConical } from 'lucide-react';

export function AdminCapabilityNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  if (import.meta.env.DEV) {
    return (
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-800/60 bg-amber-950/40 p-4 text-amber-200">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-xs leading-relaxed">
          <strong>Development preview only.</strong> {title} contains example content or local-only actions. It is not connected to production records and changes are not saved.
        </p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-[#111827] p-8 text-center">
      <AlertCircle className="mx-auto mb-4 h-8 w-8 text-amber-300" />
      <h1 className="text-lg font-bold text-white">{title} is not connected to live records</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{description}</p>
      <p className="mt-4 text-xs text-slate-400">This screen will be available when its authenticated data source and save actions are connected and verified.</p>
    </section>
  );
}
