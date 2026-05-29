import { ShoppingCart } from 'lucide-react';

export default function NewSale() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">New Sale</h1>
        <p className="text-gray-500">Initialize a retail checkout or wholesale transaction.</p>
      </header>
      <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-primary-50 rounded-full text-primary-600 mb-4">
          <ShoppingCart className="w-10 h-10 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">POS Sales Interface</h3>
        <p className="text-gray-500 max-w-sm mt-1">
          This module handles fractional fabric cuts, roll scanning, and dye-lot batch validations.
        </p>
      </div>
    </div>
  );
}
