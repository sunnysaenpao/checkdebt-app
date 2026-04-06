import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLang } from '@/contexts/LanguageContext';
import {
  Loader2,
  KeyRound,
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
} from 'lucide-react';

const STATUS_VARIANT = {
  trial: 'secondary',
  active: 'success',
  expired: 'danger',
  suspended: 'warning',
};

export default function LicenseActivation() {
  const { t } = useLang();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await api.get('/license/status');
      setStatus(res.data);
    } catch {
      setError('Failed to load license status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActivating(true);
    try {
      const res = await api.post('/license/activate', { code: code.trim().toUpperCase() });
      setSuccess('License activated successfully!');
      setCode('');
      await fetchStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to activate license');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isTrialActive = status?.is_trial_active;
  const isLicenseActive = status?.license_status === 'active' && status?.license_expires && new Date(status.license_expires) > new Date();
  const isExpired = !isTrialActive && !isLicenseActive;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('license') || 'License'}</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your subscription and license</p>
      </div>

      {/* Current Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              isExpired ? 'bg-red-100' : isLicenseActive ? 'bg-green-100' : 'bg-purple-100'
            }`}>
              <Shield className={`h-6 w-6 ${
                isExpired ? 'text-red-600' : isLicenseActive ? 'text-green-600' : 'text-purple-600'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isLicenseActive ? 'Active License' : isTrialActive ? 'Free Trial' : 'License Expired'}
                </h2>
                <Badge variant={STATUS_VARIANT[status?.license_status] || 'secondary'}>
                  {status?.license_status}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {status?.trial_ends_at && (
                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">Trial Ends</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(status.trial_ends_at)}</p>
                  </div>
                )}
                {status?.license_expires && (
                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">License Expires</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(status.license_expires)}</p>
                  </div>
                )}
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-sm font-semibold ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                    {isExpired ? 'Expired' : 'Active'}
                  </p>
                </div>
              </div>

              {isExpired && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Your trial or license has expired. Enter a license code below to continue using the system.
                </div>
              )}

              {isTrialActive && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-3 text-sm text-purple-700">
                  <Clock className="h-4 w-4 shrink-0" />
                  You are on a free trial. Purchase a license before your trial ends to avoid interruption.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activate License Code */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Activate License Code</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivate} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </div>
            )}

            <div className="flex gap-3">
              <Input
                placeholder="Enter license code (e.g. LIC-1Y-A8K3M2X9)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="font-mono uppercase"
              />
              <Button type="submit" disabled={activating || !code.trim()}>
                {activating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {activating ? 'Activating...' : 'Activate'}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Contact your administrator to purchase a license code. Available plans: Monthly, Quarterly, Semi-annual, and Yearly.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Subscription History - always shown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">License History</CardTitle>
            </div>
            {status?.subscriptions?.length > 0 && (
              <span className="text-sm text-gray-400">{status.subscriptions.length} record{status.subscriptions.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!status?.subscriptions?.length ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No license history yet. Activate a license code above to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">#</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">License Code</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Duration</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Activated</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Expires</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {status.subscriptions.map((sub, i) => {
                    const isActive = sub.is_active;
                    const isExpired = !isActive;
                    return (
                      <tr key={sub.id} className={`border-b border-gray-100 ${isActive ? 'bg-green-50/40' : ''}`}>
                        <td className="px-4 py-3 text-gray-400">{status.subscriptions.length - i}</td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-medium text-gray-700">
                            {sub.license_code}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={
                            sub.plan === 'yearly' ? 'success' :
                            sub.plan === 'semiannual' ? 'warning' :
                            sub.plan === 'quarterly' ? 'default' : 'secondary'
                          }>
                            {sub.plan === 'monthly' ? '1 Month' :
                             sub.plan === 'quarterly' ? '3 Months' :
                             sub.plan === 'semiannual' ? '6 Months' :
                             sub.plan === 'yearly' ? '12 Months' : sub.plan}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {sub.duration_days ? `${sub.duration_days} days` : '-'}
                        </td>
                        <td className="px-4 py-3">{formatDate(sub.starts_at)}</td>
                        <td className="px-4 py-3">{formatDate(sub.ends_at)}</td>
                        <td className="px-4 py-3">
                          {isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="danger">Expired</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
