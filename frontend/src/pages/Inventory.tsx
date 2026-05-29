import { Package } from 'lucide-react';

export default function Inventory() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="text-gray-500">Track and manage fabric rolls, lots, and products.</p>
      </header>
      <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-green-50 rounded-full text-green-600 mb-4">
          <Package className="w-10 h-10 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Inventory Management</h3>
        <p className="text-gray-500 max-w-sm mt-1">
          Monitor your stock levels, dye batches, end-of-roll reconciliations, and remnant conversions.
        </p>
      </div>
    </div>
  );
}
