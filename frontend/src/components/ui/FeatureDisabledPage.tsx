import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  featureName: string;
}

export default function FeatureDisabledPage({ featureName }: Props) {
  const { user } = useAuthStore();
  const canManageSettings = user?.permissions?.includes('write:settings') ?? false;

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
        <Lock className="w-6 h-6 text-amber-600" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800">{featureName} is Disabled</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        This feature is currently disabled in system settings. Existing records remain accessible.
      </p>
      <div className="flex items-center gap-4">
        <Link to="/" className="text-sm font-medium text-primary-600 hover:underline">
          Back to Dashboard
        </Link>
        {canManageSettings && (
          <Link to="/admin/settings" className="text-sm font-medium text-primary-600 hover:underline">
            Go to Settings
          </Link>
        )}
      </div>
    </div>
  );
}
