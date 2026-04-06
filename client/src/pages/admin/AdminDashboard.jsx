import { useState, useEffect } from 'react';
import adminApi from '@/lib/adminApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  KeyRound,
  Key,
  KeySquare,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .get('/stats')
      .then(({ data }) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load dashboard stats.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  const lenderCards = [
    {
      title: 'Total Lenders',
      value: stats?.totalLenders ?? 0,
      icon: Building2,
      color: 'blue',
    },
    {
      title: 'Active (Paid)',
      value: stats?.activeLenders ?? 0,
      icon: CheckCircle2,
      color: 'green',
    },
    {
      title: 'Trial',
      value: stats?.trialLenders ?? 0,
      icon: Clock,
      color: 'purple',
    },
    {
      title: 'Expired',
      value: stats?.expiredLenders ?? 0,
      icon: XCircle,
      color: 'red',
    },
  ];

  const licenseCards = [
    {
      title: 'Total License Codes',
      value: stats?.totalLicenses ?? 0,
      icon: KeyRound,
      color: 'blue',
    },
    {
      title: 'Unused',
      value: stats?.unusedLicenses ?? 0,
      icon: Key,
      color: 'green',
    },
    {
      title: 'Used',
      value: stats?.usedLicenses ?? 0,
      icon: KeySquare,
      color: 'purple',
    },
  ];

  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      value: 'text-blue-700',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      value: 'text-green-700',
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      value: 'text-purple-700',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      value: 'text-red-700',
    },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Platform overview and statistics</p>
      </div>

      {/* Lender Stats */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Lenders</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {lenderCards.map(({ title, value, icon: Icon, color }) => {
            const c = colorMap[color];
            return (
              <Card key={title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{title}</p>
                      <p className={`mt-1 text-3xl font-bold ${c.value}`}>{value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                      <Icon className={`h-6 w-6 ${c.icon}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* License Stats */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">License Codes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {licenseCards.map(({ title, value, icon: Icon, color }) => {
            const c = colorMap[color];
            return (
              <Card key={title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{title}</p>
                      <p className={`mt-1 text-3xl font-bold ${c.value}`}>{value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                      <Icon className={`h-6 w-6 ${c.icon}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
