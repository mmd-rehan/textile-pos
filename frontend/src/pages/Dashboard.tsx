import { TrendingUp, Users, ShoppingCart as SaleIcon, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

export default function Dashboard() {
  const { data: healthData, isLoading } = useQuery<any>({
    queryKey: ['backend-health'],
    queryFn: () => apiClient.get('/health'),
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Real-time overview of your textile retail shop.</p>
      </header>

      {/* Connection Status Banner */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : healthData?.success ? 'bg-green-500' : 'bg-red-500'}`} />
          <div>
            <h3 className="font-semibold text-gray-800">Backend Connectivity Status</h3>
            <p className="text-sm text-gray-500">
              {isLoading ? 'Checking connection...' : healthData?.success ? 'Successfully connected to NestJS Backend & MySQL' : 'Unable to reach backend'}
            </p>
          </div>
        </div>
        {healthData?.success && healthData.data?.services?.database && (
          <span className="text-xs bg-green-50 text-green-700 font-medium px-2.5 py-1 rounded-full border border-green-200 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Active: {healthData.data.services.database.status}
          </span>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start">
          <div>
            <span className="text-gray-500 text-sm font-medium">Today's Sales</span>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">$1,240.00</h3>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" /> +12% from yesterday
            </span>
          </div>
          <div className="p-3 bg-primary-50 rounded-lg text-primary-600">
            <SaleIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start">
          <div>
            <span className="text-gray-500 text-sm font-medium">Total Orders</span>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">24</h3>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" /> +8% from last week
            </span>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start">
          <div>
            <span className="text-gray-500 text-sm font-medium">Low Stock Items</span>
            <h3 className="text-3xl font-bold text-red-600 mt-1">5</h3>
            <span className="text-xs text-red-500 font-medium flex items-center gap-1 mt-2">
              Needs urgent replenishment
            </span>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
