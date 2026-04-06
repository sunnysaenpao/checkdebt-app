import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Plus, Search, Loader2, FileText } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';

const STATUS_VARIANT = {
  active: 'default',
  completed: 'success',
  defaulted: 'danger',
};

export default function Loans() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const res = await api.get('/loans');
        setLoans(res.data);
      } catch (err) {
        setError(
          err.response?.data?.message || 'Failed to load loans.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, []);

  // Filter loans by borrower name search
  const filtered = loans.filter((loan) => {
    const borrowerName = loan.borrower?.name || '';
    return borrowerName.toLowerCase().includes(search.toLowerCase());
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('loans')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all loan records
          </p>
        </div>
        <Button onClick={() => navigate('/loans/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newLoan')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder={t('searchLoans')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loans Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('borrower')}</TableHead>
                  <TableHead>{t('principal')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('interestRate')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('term')}</TableHead>
                  <TableHead>{t('outstanding')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('date')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((loan) => (
                  <TableRow
                    key={loan.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/loans/${loan.id}`)}
                  >
                    <TableCell className="font-medium text-gray-900">
                      {loan.borrower?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(loan.principal)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-600">
                      {loan.interest_rate}% / {loan.interest_rate_unit}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-600">
                      {loan.term_length} {loan.term_unit}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(loan.outstanding_balance)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[loan.status] || 'secondary'}>
                        {loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500">
                      {formatDate(loan.disbursed_at || loan.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/loans/${loan.id}`);
                        }}
                      >
                        {t('view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <FileText className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-900">
                {search ? 'No loans match your search' : t('noLoansYet')}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'Try a different search term.'
                  : 'Create your first loan to get started.'}
              </p>
              {!search && (
                <Button
                  className="mt-4"
                  onClick={() => navigate('/loans/new')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('newLoan')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
