import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import adminApi from '@/lib/adminApi';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  ArrowLeft,
  Building2,
  Users,
  Banknote,
  KeyRound,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

const statusVariant = {
  trial: 'secondary',
  active: 'success',
  expired: 'danger',
  suspended: 'warning',
};

const loanStatusVariant = {
  active: 'success',
  paid: 'default',
  overdue: 'danger',
  defaulted: 'danger',
};

export default function AdminLenderDetail() {
  const { id } = useParams();
  const [lender, setLender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .get(`/lenders/${id}`)
      .then(({ data }) => {
        setLender(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load lender details.');
        setLoading(false);
      });
  }, [id]);

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
        <Link to="/admin/lenders">
          <Button variant="outline" className="mt-4">
            Back to Lenders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/admin/lenders">
        <Button variant="ghost" size="sm">
          <ArrowLeft size={16} />
          Back to Lenders
        </Button>
      </Link>

      {/* Lender info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 size={20} />
            {lender.companyName || lender.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge variant={statusVariant[lender.status] || 'secondary'} className="mt-1">
                {lender.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Trial Ends</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {formatDate(lender.trialEndsAt) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">License Expires</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {formatDate(lender.licenseExpiresAt) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {formatDate(lender.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            Users ({lender.users?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!lender.users?.length ? (
            <p className="py-6 text-center text-gray-500">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lender.users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'owner' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Loans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote size={20} />
            Recent Loans ({lender.recentLoans?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!lender.recentLoans?.length ? (
            <p className="py-6 text-center text-gray-500">No loans found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lender.recentLoans.map((loan) => (
                  <TableRow key={loan._id}>
                    <TableCell className="font-medium">
                      {loan.borrowerName || loan.borrower?.name || 'N/A'}
                    </TableCell>
                    <TableCell>{formatCurrency(loan.principal)}</TableCell>
                    <TableCell>
                      <Badge variant={loanStatusVariant[loan.status] || 'secondary'}>
                        {loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(loan.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subscription History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={20} />
            Subscription History ({lender.subscriptions?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!lender.subscriptions?.length ? (
            <p className="py-6 text-center text-gray-500">No subscription history.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>License Code</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lender.subscriptions.map((sub, idx) => (
                  <TableRow key={sub._id || idx}>
                    <TableCell className="font-medium capitalize">{sub.plan}</TableCell>
                    <TableCell>
                      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {sub.licenseCode || 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell>{formatDate(sub.startsAt)}</TableCell>
                    <TableCell>{formatDate(sub.endsAt)}</TableCell>
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
