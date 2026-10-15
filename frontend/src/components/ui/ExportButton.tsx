import { Download } from 'lucide-react';
import { useState } from 'react';
import { reportsApi, type ReportExportName } from '../../api/reports';
import { useAppStore } from '../../store/useAppStore';

type FileResponse = { data: Blob; headers: Record<string, string> };

type ExportButtonProps =
  | {
      report: ReportExportName;
      // Same filters the report screen is using; page/limit are ignored server-side.
      params: Record<string, string | number | undefined>;
    }
  | {
      // Any other .xlsx endpoint (e.g. supplier statement)
      download: () => Promise<FileResponse>;
      fallbackName: string;
    };

export default function ExportButton(props: ExportButtonProps) {
  const { showNotification } = useAppStore();
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      let res: FileResponse;
      let fallbackName: string;
      if ('report' in props) {
        const clean = Object.fromEntries(Object.entries(props.params).filter(([, v]) => v !== '' && v !== undefined));
        res = await reportsApi.exportReport(props.report, clean);
        fallbackName = `${props.report}.xlsx`;
      } else {
        res = await props.download();
        fallbackName = props.fallbackName;
      }
      const match = /filename="?([^"]+)"?/.exec(res.headers['content-disposition'] ?? '');
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = match?.[1] ?? fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      // Error bodies come back as a Blob because of responseType: 'blob'
      let message = err?.message ?? 'Export failed';
      const blob = err?.details?.response?.data;
      if (blob instanceof Blob) {
        try {
          message = JSON.parse(await blob.text())?.error?.message ?? message;
        } catch {
          // keep default message
        }
      }
      showNotification(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={busy}
      className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
    >
      {busy ? (
        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {busy ? 'Exporting…' : 'Export to Excel'}
    </button>
  );
}
