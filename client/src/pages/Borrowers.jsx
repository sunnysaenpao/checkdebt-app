import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Plus, Search, Loader2, Users } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';

export default function Borrowers() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBorrowers = async () => {
      try {
        const res = await api.get('/borrowers');
        setBorrowers(res.data);
      } catch (err) {
        setError(
          err.response?.data?.message || 'Failed to load borrowers.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBorrowers();
  }, []);

  const filtered = borrowers.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">{t('borrowers')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your borrower records
          </p>
        </div>
        <Button onClick={() => navigate('/borrowers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addBorrower')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder={t('searchBorrowers')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('phone')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('address')}</TableHead>
                  <TableHead className="text-center">{t('loanCount')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((borrower) => (
                  <TableRow
                    key={borrower.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/borrowers/${borrower.id}`)}
                  >
                    <TableCell className="font-medium text-gray-900">
                      {borrower.name}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {borrower.phone || '-'}
                    </TableCell>
                    <TableCell className="hidden max-w-xs truncate text-gray-500 md:table-cell">
                      {borrower.registered_address || borrower.residential_address || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-100 px-2 text-xs font-medium text-blue-800">
                        {borrower._count?.loans ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/borrowers/${borrower.id}`);
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
              <Users className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-900">
                {search ? 'No borrowers match your search' : t('noBorrowers')}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'Try a different search term.'
                  : 'Add your first borrower to get started.'}
              </p>
              {!search && (
                <Button
                  className="mt-4"
                  onClick={() => navigate('/borrowers/new')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addBorrower')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
