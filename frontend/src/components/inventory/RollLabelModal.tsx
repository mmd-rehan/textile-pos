import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatAmount } from '../../constants/currencies';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export interface RollLabelData {
  barcode: string;
  rollNumber: string;
  productName?: string | null;
  productCode?: string | null;
  colorName?: string | null;
  designName?: string | null;
  batchNumber?: string | null;
  remainingLengthYard?: string | number | null;
  salePricePerYard?: string | number | null;
  currencyCode: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  roll: RollLabelData;
}

const MAX_COPIES = 50;

/**
 * Printable roll label (Code 128). Printed through the browser like receipts —
 * no printer driver involved — so it works with any label or A4 printer.
 */
export default function RollLabelModal({ open, onClose, roll }: Props) {
  const [copies, setCopies] = useState(1);
  const count = Math.min(Math.max(Math.floor(copies) || 1, 1), MAX_COPIES);

  return (
    <Modal open={open} onClose={onClose} title="Print Roll Label" size="sm">
      <div className="space-y-4">
        <div className="flex items-end gap-3 print:hidden">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Copies
            <input
              type="number"
              min={1}
              max={MAX_COPIES}
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <Button type="button" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Print {count > 1 ? `${count} labels` : 'label'}
          </Button>
        </div>

        <div className="flex flex-col items-center gap-4 print:block">
          {Array.from({ length: count }, (_, i) => (
            <RollLabel key={i} roll={roll} pageBreak={i < count - 1} hiddenOnScreen={i > 0} />
          ))}
        </div>
      </div>
    </Modal>
  );
}

function RollLabel({ roll, pageBreak, hiddenOnScreen }: { roll: RollLabelData; pageBreak: boolean; hiddenOnScreen: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, roll.barcode, {
        format: 'CODE128',
        width: 1.6,
        height: 48,
        fontSize: 12,
        margin: 0,
        displayValue: true,
      });
      setError(false);
    } catch {
      setError(true);
    }
  }, [roll.barcode]);

  const variant = [roll.colorName, roll.designName].filter(Boolean).join(' · ');

  return (
    <div
      className={`w-[60mm] min-h-[40mm] border border-dashed border-gray-300 rounded p-[3mm] bg-white text-black print:border-0 print:rounded-none
        ${pageBreak ? 'print:break-after-page' : ''} ${hiddenOnScreen ? 'hidden print:block' : ''}`}
    >
      <p className="text-[11px] font-bold leading-tight truncate">{roll.productName ?? '—'}</p>
      <p className="text-[9px] leading-tight truncate">
        {roll.productCode ? `${roll.productCode} · ` : ''}
        {roll.rollNumber}
      </p>
      {variant && <p className="text-[9px] leading-tight truncate">{variant}</p>}
      <div className="flex justify-between text-[9px] leading-tight mt-0.5">
        <span>{roll.remainingLengthYard != null ? `${Number(roll.remainingLengthYard).toFixed(2)} yd` : ''}</span>
        <span className="font-semibold">
          {roll.salePricePerYard != null ? `${formatAmount(roll.salePricePerYard, roll.currencyCode)}/yd` : ''}
        </span>
      </div>
      {roll.batchNumber && <p className="text-[9px] leading-tight truncate">Batch {roll.batchNumber}</p>}
      <div className="mt-1 flex justify-center">
        {error ? (
          <p className="font-mono text-xs">{roll.barcode}</p>
        ) : (
          <svg ref={svgRef} className="max-w-full h-auto" />
        )}
      </div>
    </div>
  );
}
