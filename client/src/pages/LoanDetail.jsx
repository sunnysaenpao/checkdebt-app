import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import {
  Loader2,
  ArrowLeft,
  DollarSign,
  Percent,
  Calendar,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Pencil,
  CalendarClock,
  Banknote,
  Building2,
  Upload,
  Image,
  ExternalLink,
} from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Status badge variant mapping
// ─────────────────────────────────────────────────────────────────────────────
const LOAN_STATUS_VARIANT = {
  active: 'default',
  completed: 'success',
  defaulted: 'danger',
};

const SCHEDULE_STATUS_VARIANT = {
  pending: 'secondary',
  partial: 'warning',
  paid: 'success',
  overdue: 'danger',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: determine the row tint class for a schedule row
// ─────────────────────────────────────────────────────────────────────────────
function getScheduleRowClass(schedule) {
  // Check if overdue: due_date is past and not fully paid
  const isOverdue =
    schedule.status === 'overdue' ||
    (schedule.status !== 'paid' && new Date(schedule.due_date) < new Date());

  if (schedule.status === 'paid') return 'bg-green-50/60';
  if (isOverdue) return 'bg-red-50/60';
  if (schedule.status === 'partial') return 'bg-yellow-50/60';
  return '';
}

export default function LoanDetail() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    schedule: null,
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    notes: '',
    payment_type: 'cash',
    slip_file: null,
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, schedule: null });
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch loan data (including schedules and payments)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchLoan = async () => {
    try {
      const res = await api.get(`/loans/${id}`);
      setLoan(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load loan details.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoan();
  }, [id]);

  // ─────────────────────────────────────────────────────────────────────────
  // Open the payment modal for a specific schedule installment
  // ─────────────────────────────────────────────────────────────────────────
  const openPaymentModal = (schedule) => {
    // Calculate remaining amounts for this installment
    const remainingInterest = (schedule.interest_due || 0) - (schedule.interest_paid || 0);
    const remainingPrincipal = (schedule.principal_due || 0) - (schedule.principal_paid || 0);
    const remainingTotal = remainingInterest + remainingPrincipal;

    setPaymentModal({ open: true, schedule });
    setPaymentForm({
      amount: remainingTotal > 0 ? remainingTotal.toFixed(2) : '',
      notes: '',
      payment_type: 'cash',
      slip_file: null,
    });
    setPaymentError('');
  };

  const closePaymentModal = () => {
    setPaymentModal({ open: false, schedule: null });
    setPaymentForm({ amount: '', notes: '', payment_type: 'cash', slip_file: null });
    setPaymentError('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Submit a payment for a schedule installment
  // ─────────────────────────────────────────────────────────────────────────
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentError('');
    setPaymentSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('amount', paymentForm.amount);
      formData.append('schedule_id', paymentModal.schedule.id);
      formData.append('payment_type', paymentForm.payment_type);
      if (paymentForm.notes) formData.append('notes', paymentForm.notes);
      if (paymentForm.slip_file) formData.append('slip_image', paymentForm.slip_file);

      await api.post(`/payments/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Close modal and refresh loan data
      closePaymentModal();
      await fetchLoan();
    } catch (err) {
      setPaymentError(
        err.response?.data?.message || 'Failed to record payment.'
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Edit Loan
  // ─────────────────────────────────────────────────────────────────────────
  const canEdit = loan && (!loan.payments || loan.payments.length === 0);

  const openEditModal = () => {
    setEditForm({
      principal: loan.principal,
      interest_rate: loan.interest_rate,
      interest_rate_unit: loan.interest_rate_unit,
      interest_method: loan.interest_method || 'flat',
      term_length: loan.term_length,
      term_unit: loan.term_unit,
      payment_frequency: loan.payment_frequency,
      interest_behavior: loan.interest_behavior,
      disbursed_at: loan.disbursed_at ? new Date(loan.disbursed_at).toISOString().split('T')[0] : '',
    });
    setEditError('');
    setEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSubmitting(true);
    try {
      await api.put(`/loans/${id}`, {
        ...editForm,
        principal: parseFloat(editForm.principal),
        interest_rate: parseFloat(editForm.interest_rate),
        term_length: parseInt(editForm.term_length, 10),
      });
      setEditModal(false);
      await fetchLoan();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update loan.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Reschedule a single payment due date
  // ─────────────────────────────────────────────────────────────────────────
  const openRescheduleModal = (schedule) => {
    setRescheduleModal({ open: true, schedule });
    setRescheduleDate(new Date(schedule.due_date).toISOString().split('T')[0]);
    setRescheduleError('');
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setRescheduleError('');
    setRescheduleSubmitting(true);
    try {
      await api.patch(`/loans/${id}/schedule/${rescheduleModal.schedule.id}`, {
        due_date: rescheduleDate,
      });
      setRescheduleModal({ open: false, schedule: null });
      await fetchLoan();
    } catch (err) {
      setRescheduleError(err.response?.data?.error || 'Failed to reschedule.');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading / Error / Empty states
  // ─────────────────────────────────────────────────────────────────────────
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

  if (!loan) return null;

  // ─────────────────────────────────────────────────────────────────────────
  // Derived data
  // ─────────────────────────────────────────────────────────────────────────
  const schedules = loan.schedules || [];
  const payments = loan.payments || [];
  const borrowerName = loan.borrower?.name || 'Unknown';

  // Sort payments by date descending (most recent first)
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  // Current schedule item for payment modal
  const modalSchedule = paymentModal.schedule;
  const modalRemainingInterest = modalSchedule
    ? (modalSchedule.interest_due || 0) - (modalSchedule.interest_paid || 0)
    : 0;
  const modalRemainingPrincipal = modalSchedule
    ? (modalSchedule.principal_due || 0) - (modalSchedule.principal_paid || 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/loans')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{t('loanDetails')}</h1>
              <Badge variant={LOAN_STATUS_VARIANT[loan.status] || 'secondary'}>
                {loan.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {t('borrower')}:{' '}
              <Link
                to={`/borrowers/${loan.borrower_id}`}
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                {borrowerName}
              </Link>
            </p>
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={openEditModal}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('editLoan')}
          </Button>
        )}
      </div>

      {/* ─── Loan Summary Metrics ─── */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {/* Principal */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('principal')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(loan.principal)}
                </p>
              </div>
            </div>

            {/* Interest Rate */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <Percent className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('interestRate')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {loan.interest_rate}% / {loan.interest_rate_unit}
                </p>
              </div>
            </div>

            {/* Term */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('term')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {loan.term_length} {loan.term_unit}
                </p>
              </div>
            </div>

            {/* Total Interest */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('totalInterest')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(loan.total_interest)}
                </p>
              </div>
            </div>

            {/* Total Payable */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                <CreditCard className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('totalPayable')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(loan.total_payable)}
                </p>
              </div>
            </div>

            {/* Outstanding Balance */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <Clock className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('outstanding')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(loan.outstanding_balance)}
                </p>
              </div>
            </div>

            {/* Total Paid */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('totalPaid')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(loan.total_paid)}
                </p>
              </div>
            </div>

            {/* Interest Behavior */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <TrendingDown className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('interestBehavior')}</p>
                <p className="text-sm font-semibold capitalize text-gray-900">
                  {loan.interest_behavior || 'simple'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Payment Schedule Table ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('paymentSchedule')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {schedules.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('dueDate')}</TableHead>
                    <TableHead>{t('principalDue')}</TableHead>
                    <TableHead>{t('interestDue')}</TableHead>
                    <TableHead>{t('totalDue')}</TableHead>
                    <TableHead>{t('paid')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule, index) => {
                    const totalDue = (schedule.principal_due || 0) + (schedule.interest_due || 0);
                    const totalPaid = (schedule.principal_paid || 0) + (schedule.interest_paid || 0);
                    const isPaidOrCompleted = schedule.status === 'paid';
                    const canPay = !isPaidOrCompleted;

                    return (
                      <TableRow
                        key={schedule.id}
                        className={getScheduleRowClass(schedule)}
                      >
                        <TableCell className="font-mono text-xs text-gray-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(schedule.due_date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCurrency(schedule.principal_due)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCurrency(schedule.interest_due)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatCurrency(totalDue)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCurrency(totalPaid)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              SCHEDULE_STATUS_VARIANT[schedule.status] ||
                              // Fallback: check if overdue by date
                              (schedule.status !== 'paid' &&
                                new Date(schedule.due_date) < new Date()
                                ? 'danger'
                                : 'secondary')
                            }
                          >
                            {schedule.status ||
                              (new Date(schedule.due_date) < new Date()
                                ? 'overdue'
                                : 'pending')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canPay && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-gray-500 hover:text-blue-600"
                                  onClick={() => openRescheduleModal(schedule)}
                                  title="Reschedule due date"
                                >
                                  <CalendarClock className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPaymentModal(schedule)}
                                >
                                  {t('pay')}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              {t('noSchedule')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Payment History Table ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('paymentHistory')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('interestDue')}</TableHead>
                  <TableHead>{t('principalDue')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('notes')}</TableHead>
                  <TableHead>{t('slip')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">
                      {formatDate(payment.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.payment_type === 'bank_transfer' ? 'default' : 'secondary'}>
                        {payment.payment_type === 'bank_transfer' ? t('bank') : t('cash')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatCurrency(payment.interest_paid)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatCurrency(payment.principal_paid)}
                    </TableCell>
                    <TableCell className="hidden max-w-xs truncate text-sm text-gray-500 md:table-cell">
                      {payment.notes || '-'}
                    </TableCell>
                    <TableCell>
                      {payment.slip_image ? (
                        <a
                          href={payment.slip_image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t('view')}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              {t('noPayments')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Reschedule Modal ─── */}
      <Modal
        open={rescheduleModal.open}
        onClose={() => setRescheduleModal({ open: false, schedule: null })}
        title={t('reschedulePayment')}
      >
        {rescheduleModal.schedule && (
          <form onSubmit={handleRescheduleSubmit} className="space-y-4">
            {rescheduleError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {rescheduleError}
              </div>
            )}

            <div className="rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">{t('installment')}</p>
                  <p className="font-medium text-gray-900">
                    #{rescheduleModal.schedule.installment}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">{t('amountDue')}</p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(rescheduleModal.schedule.total_due)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">{t('currentDueDate')}</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(rescheduleModal.schedule.due_date)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">{t('status')}</p>
                  <Badge variant={SCHEDULE_STATUS_VARIANT[rescheduleModal.schedule.status] || 'secondary'}>
                    {rescheduleModal.schedule.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Input
              label={t('newDueDate')}
              name="due_date"
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRescheduleModal({ open: false, schedule: null })}
                disabled={rescheduleSubmitting}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={rescheduleSubmitting}>
                {rescheduleSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {rescheduleSubmitting ? t('saving') : t('reschedule')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── Edit Loan Modal ─── */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title={t('editLoanTitle')}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {editError}
            </div>
          )}

          <Input
            label={t('principalAmount')}
            name="principal"
            type="number"
            min="0"
            step="0.01"
            value={editForm.principal}
            onChange={handleEditChange}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('interestRatePercent')}
              name="interest_rate"
              type="number"
              min="0"
              step="0.01"
              value={editForm.interest_rate}
              onChange={handleEditChange}
              required
            />
            <Select
              label={t('rateUnit')}
              name="interest_rate_unit"
              value={editForm.interest_rate_unit}
              onChange={handleEditChange}
            >
              <option value="daily">{t('daily')}</option>
              <option value="monthly">{t('monthly')}</option>
              <option value="yearly">{t('yearly')}</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('termLength')}
              name="term_length"
              type="number"
              min="1"
              step="1"
              value={editForm.term_length}
              onChange={handleEditChange}
              required
            />
            <Select
              label={t('termUnit')}
              name="term_unit"
              value={editForm.term_unit}
              onChange={handleEditChange}
            >
              <option value="days">{t('days')}</option>
              <option value="months">{t('months')}</option>
            </Select>
          </div>

          <Select
            label={t('paymentFrequency')}
            name="payment_frequency"
            value={editForm.payment_frequency}
            onChange={handleEditChange}
          >
            <option value="daily">{t('daily')}</option>
            <option value="weekly">{t('weekly')}</option>
            <option value="monthly">{t('monthly')}</option>
          </Select>

          <Select
            label={t('interestBehavior')}
            name="interest_behavior"
            value={editForm.interest_behavior}
            onChange={handleEditChange}
          >
            <option value="simple">{t('simple')}</option>
            <option value="capitalize">{t('capitalize')}</option>
          </Select>

          <Input
            label={t('disbursementDate')}
            name="disbursed_at"
            type="date"
            value={editForm.disbursed_at}
            onChange={handleEditChange}
            required
          />

          <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
            {t('editWarning')}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModal(false)}
              disabled={editSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={editSubmitting}>
              {editSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editSubmitting ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Payment Modal ─── */}
      <Modal
        open={paymentModal.open}
        onClose={closePaymentModal}
        title={t('recordPayment')}
      >
        {modalSchedule && (
          <form onSubmit={handlePaymentSubmit}>
            <div className="space-y-4">
              {/* Installment info */}
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">{t('installment')}</p>
                    <p className="font-medium text-gray-900">
                      #{schedules.findIndex((s) => s.id === modalSchedule.id) + 1}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('dueDate')}</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(modalSchedule.due_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('remainingInterest')}</p>
                    <p className="font-medium text-orange-600">
                      {formatCurrency(modalRemainingInterest)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('remainingPrincipal')}</p>
                    <p className="font-medium text-blue-600">
                      {formatCurrency(modalRemainingPrincipal)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{t('totalRemaining')}</span>
                    <span className="text-base font-bold text-gray-900">
                      {formatCurrency(modalRemainingInterest + modalRemainingPrincipal)}
                    </span>
                  </div>
                </div>
              </div>

              {paymentError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {paymentError}
                </div>
              )}

              {/* Payment Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{t('paymentType')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentForm((prev) => ({ ...prev, payment_type: 'cash', slip_file: null }))}
                    className={`flex items-center gap-2.5 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                      paymentForm.payment_type === 'cash'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Banknote className="h-5 w-5" />
                    {t('cash')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm((prev) => ({ ...prev, payment_type: 'bank_transfer' }))}
                    className={`flex items-center gap-2.5 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                      paymentForm.payment_type === 'bank_transfer'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Building2 className="h-5 w-5" />
                    {t('bankTransfer')}
                  </button>
                </div>
              </div>

              {/* Payment amount input */}
              <Input
                label={t('paymentAmount')}
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                required
              />

              {/* Bank Transfer: Slip Upload */}
              {paymentForm.payment_type === 'bank_transfer' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('paymentSlip')}
                  </label>
                  {!paymentForm.slip_file ? (
                    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 transition-colors hover:border-blue-400 hover:bg-blue-50/50">
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="text-sm text-gray-500">{t('clickToUpload')}</span>
                      <span className="text-xs text-gray-400">{t('fileTypes')}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            setPaymentForm((prev) => ({ ...prev, slip_file: e.target.files[0] }));
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                      <Image className="h-5 w-5 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-green-800">{paymentForm.slip_file.name}</p>
                        <p className="text-xs text-green-600">{(paymentForm.slip_file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentForm((prev) => ({ ...prev, slip_file: null }))}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        {t('remove')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Notes (optional) */}
              <div className="w-full">
                <label
                  htmlFor="payment-notes"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  {t('notesOptional')}
                </label>
                <textarea
                  id="payment-notes"
                  name="notes"
                  rows={2}
                  className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder={paymentForm.payment_type === 'bank_transfer' ? t('bankPlaceholder') : t('cashPlaceholder')}
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closePaymentModal}
                  disabled={paymentSubmitting}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={paymentSubmitting}>
                  {paymentSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {paymentSubmitting ? t('recording') : t('recordPayment')}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
