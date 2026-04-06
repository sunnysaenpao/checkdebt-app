import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '@/lib/adminApi';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Building2,
  Search,
  Eye,
  ShieldOff,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

const statusVariant = {
  trial: 'secondary',
  active: 'success',
  expired: 'danger',
  suspended: 'warning',
};

export default function AdminLenders() {
  const [lenders, setLenders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchLenders = useCallback(() => {
    setLoading(true);
    adminApi
      .get('/lenders')
      .then(({ data }) => {
        setLenders(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load lenders.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLenders();
  }, [fetchLenders]);

  const handleToggleStatus = async (lender) => {
    const newStatus = lender.status === 'suspended' ? 'active' : 'suspended';
    setActionLoading(lender._id);

    try {
      await adminApi.patch(`/lenders/${lender._id}/status`, { status: newStatus });
      setLenders((prev) =>
        prev.map((l) => (l._id === lender._id ? { ...l, status: newStatus } : l))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = lenders.filter((l) =>
    (l.companyName || l.name || '').toLowerCase().includes(search.toLowerCase())
  );

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
        <Button variant="outline" className="mt-4" onClick={fetchLenders}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lenders</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all registered lenders on the platform
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 size={20} />
              All Lenders ({filtered.length})
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {search ? 'No lenders match your search.' : 'No lenders registered yet.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial Ends</TableHead>
                  <TableHead>License Expires</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Borrowers</TableHead>
                  <TableHead>Loans</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lender) => (
                  <TableRow key={lender._id}>
                    <TableCell className="font-medium">
                      {lender.companyName || lender.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[lender.status] || 'secondary'}>
                        {lender.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(lender.trialEndsAt)}</TableCell>
                    <TableCell>{formatDate(lender.licenseExpiresAt)}</TableCell>
                    <TableCell>{lender.userCount ?? 0}</TableCell>
                    <TableCell>{lender.borrowerCount ?? 0}</TableCell>
                    <TableCell>{lender.loanCount ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/lenders/${lender._id}`}>
                          <Button variant="outline" size="sm">
                            <Eye size={14} />
                            View
                          </Button>
                        </Link>
                        <Button
                          variant={lender.status === 'suspended' ? 'default' : 'warning'}
                          size="sm"
                          onClick={() => handleToggleStatus(lender)}
                          disabled={actionLoading === lender._id}
                        >
                          {actionLoading === lender._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : lender.status === 'suspended' ? (
                            <>
                              <ShieldCheck size={14} />
                              Activate
                            </>
                          ) : (
                            <>
                              <ShieldOff size={14} />
                              Suspend
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
