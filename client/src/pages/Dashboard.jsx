import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLang } from '@/contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Loader2,
  Users,
  FileText,
  CircleDollarSign,
  Clock,
} from 'lucide-react';

const STATUS_VARIANT = {
  active: 'default',
  completed: 'success',
  defaulted: 'danger',
};

export default function Dashboard() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch (err) {
        setError(
          err.response?.data?.message || 'Failed to load dashboard data.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="rounded-lg bg-red-50 px-6 py-4 text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: t('totalLent'),
      value: formatCurrency(data.totalLent),
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-400/30',
    },
    {
      title: t('totalCollected'),
      value: formatCurrency(data.totalCollected),
      icon: TrendingUp,
      gradient: 'from-green-500 to-green-600',
      iconBg: 'bg-green-400/30',
    },
    {
      title: t('totalOutstanding'),
      value: formatCurrency(data.totalOutstanding),
      icon: Wallet,
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-400/30',
    },
    {
      title: t('overdueAmount'),
      value: formatCurrency(data.overdueAmount),
      icon: AlertTriangle,
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-400/30',
    },
    {
      title: t('interestCollected'),
      value: formatCurrency(data.interestCollected),
      icon: CircleDollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-400/30',
    },
    {
      title: t('futureInterest'),
      value: formatCurrency(data.futureInterest),
      icon: Clock,
      gradient: 'from-cyan-500 to-blue-500',
      iconBg: 'bg-cyan-400/30',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your lending portfolio
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`overflow-hidden border-0 bg-gradient-to-br ${stat.gradient} text-white shadow-lg`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">
                      {stat.title}
                    </p>
                    <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconBg}`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Badges */}
      <div className="flex flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
          <FileText className="h-4 w-4" />
          {t('activeLoans')}: {data.activeLoans ?? 0}
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">
          <Users className="h-4 w-4" />
          {t('borrowers')}: {data.borrowers ?? 0}
        </div>
      </div>

      {/* Recent Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('recentLoans')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentLoans?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('borrower')}</TableHead>
                  <TableHead>{t('principal')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/loans/${loan.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {loan.borrower_name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatCurrency(loan.principal)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[loan.status] || 'secondary'}>
                        {t(loan.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(loan.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No loans found. Create your first loan to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
