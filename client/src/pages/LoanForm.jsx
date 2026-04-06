import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Loader2, ArrowLeft, Calculator, DollarSign, Calendar, Percent, Hash, CreditCard, FileSignature } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import LoanContract from '@/components/LoanContract';

export default function LoanForm() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedBorrower = searchParams.get('borrower') || '';

  // Borrower list for dropdown
  const [borrowers, setBorrowers] = useState([]);
  const [loadingBorrowers, setLoadingBorrowers] = useState(true);

  // Form state
  const [form, setForm] = useState({
    borrower_id: preselectedBorrower,
    principal: '',
    collateral: 'ไม่มี',
    collateral_other: '',
    interest_rate: '',
    interest_rate_unit: 'monthly',
    interest_method: 'flat',
    term_length: '',
    term_unit: 'months',
    payment_frequency: 'monthly',
    interest_behavior: 'simple',
    disbursed_at: new Date().toISOString().split('T')[0], // Default to today
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showContract, setShowContract] = useState(false);
  const [lenderInfo, setLenderInfo] = useState(null);

  // Fetch borrowers and lender info
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [borrowerRes, authRes] = await Promise.all([
          api.get('/borrowers'),
          api.get('/auth/me'),
        ]);
        setBorrowers(borrowerRes.data);
        setLenderInfo({ name: authRes.data.lenderName, address: '' });
        // Try to get lender address from map endpoint
        try {
          const mapRes = await api.get('/map');
          if (mapRes.data.lender) {
            setLenderInfo({ name: mapRes.data.lender.name, address: mapRes.data.lender.address || '' });
          }
        } catch {}
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load data.');
      } finally {
        setLoadingBorrowers(false);
      }
    };
    fetchData();
  }, []);

  // Generic form field handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LIVE PREVIEW CALCULATION
  //
  // All calculations are done client-side for instant feedback as the user
  // fills in the form. The server will recalculate authoritatively on submit.
  // ─────────────────────────────────────────────────────────────────────────────
  const preview = useMemo(() => {
    const principal = parseFloat(form.principal) || 0;
    const rate = parseFloat(form.interest_rate) || 0;
    const termLength = parseFloat(form.term_length) || 0;

    if (!principal || !rate || !termLength) {
      return null; // Not enough data to calculate
    }

    // Step 1: Convert the user-entered interest rate to a daily decimal rate.
    //   - "daily"   -> rate is already per-day, just divide by 100
    //   - "monthly" -> divide by 30 to approximate daily
    //   - "yearly"  -> divide by 365 to approximate daily
    let dailyRate;
    switch (form.interest_rate_unit) {
      case 'daily':
        dailyRate = rate / 100;
        break;
      case 'monthly':
        dailyRate = rate / 100 / 30;
        break;
      case 'yearly':
        dailyRate = rate / 100 / 365;
        break;
      default:
        dailyRate = rate / 100 / 30;
    }

    // Step 2: Convert the term length to total days.
    //   - "days"   -> already in days
    //   - "months" -> multiply by 30
    let totalDays;
    switch (form.term_unit) {
      case 'days':
        totalDays = termLength;
        break;
      case 'months':
        totalDays = termLength * 30;
        break;
      default:
        totalDays = termLength * 30;
    }

    // Step 3: Calculate flat interest.
    //   Flat interest = principal * dailyRate * totalDays
    //   This means interest is always calculated on the original principal,
    //   regardless of how much has been repaid.
    const totalInterest = principal * dailyRate * totalDays;
    const totalPayable = principal + totalInterest;

    // Step 4: Determine the number of installments based on payment frequency.
    //   - "daily"   -> one installment per day
    //   - "weekly"  -> one installment per 7 days (rounded up)
    //   - "monthly" -> one installment per 30 days (rounded up)
    let installmentCount;
    switch (form.payment_frequency) {
      case 'daily':
        installmentCount = totalDays;
        break;
      case 'weekly':
        installmentCount = Math.ceil(totalDays / 7);
        break;
      case 'monthly':
        installmentCount = Math.ceil(totalDays / 30);
        break;
      default:
        installmentCount = Math.ceil(totalDays / 30);
    }

    // Step 5: Calculate per-installment amount (total split equally).
    const installmentAmount = installmentCount > 0
      ? totalPayable / installmentCount
      : 0;

    return {
      dailyRate,
      totalDays,
      totalInterest,
      totalPayable,
      installmentCount,
      installmentAmount,
    };
  }, [
    form.principal,
    form.interest_rate,
    form.interest_rate_unit,
    form.term_length,
    form.term_unit,
    form.payment_frequency,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // FORM SUBMISSION
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 1: validate form and show contract for signing
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.borrower_id || !form.principal || !form.interest_rate || !form.term_length) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setError('');
    setShowContract(true);
  };

  // Step 2: after contract is signed, submit everything to backend
  const handleContractComplete = async (signatures) => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        borrower_id: form.borrower_id,
        principal: parseFloat(form.principal),
        interest_rate: parseFloat(form.interest_rate),
        interest_rate_unit: form.interest_rate_unit,
        interest_method: form.interest_method,
        term_length: parseInt(form.term_length, 10),
        term_unit: form.term_unit,
        payment_frequency: form.payment_frequency,
        interest_behavior: form.interest_behavior,
        collateral: form.collateral === 'อื่นๆ' ? `อื่นๆ: ${form.collateral_other}` : form.collateral,
        disbursed_at: form.disbursed_at,
        sig_lender: signatures.lender,
        sig_borrower: signatures.borrower,
        sig_witness1: signatures.witness1,
        sig_witness2: signatures.witness2,
        witness1_name: signatures.witness1_name,
        witness2_name: signatures.witness2_name,
      };

      const res = await api.post('/loans', payload);
      navigate(`/loans/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create loan.');
      setShowContract(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Get selected borrower data for contract
  const selectedBorrower = borrowers.find((b) => b.id === form.borrower_id);

  if (loadingBorrowers) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show contract signing step
  if (showContract && preview && selectedBorrower && lenderInfo) {
    return (
      <LoanContract
        lender={lenderInfo}
        borrower={selectedBorrower}
        loanTerms={{
          principal: parseFloat(form.principal),
          interest_rate: parseFloat(form.interest_rate),
          interest_rate_unit: form.interest_rate_unit,
          term_length: parseInt(form.term_length),
          term_unit: form.term_unit,
          payment_frequency: form.payment_frequency,
          total_interest: preview.totalInterest,
          total_payable: preview.totalPayable,
          installment_count: preview.installmentCount,
          installment_amount: preview.installmentAmount,
          disbursed_at: form.disbursed_at,
          collateral: form.collateral === 'อื่นๆ' ? `อื่นๆ: ${form.collateral_other}` : form.collateral,
        }}
        onComplete={handleContractComplete}
        onCancel={() => setShowContract(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('newLoanTitle')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('newLoanSubtitle')}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-6 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Main layout: Form + Preview side by side on desktop */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ─── Form Fields (left, 3 cols) ─── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Borrower Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('borrower')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  label={t('selectBorrower')}
                  name="borrower_id"
                  value={form.borrower_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">{t('chooseBorrower')}</option>
                  {borrowers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.phone ? `(${b.phone})` : ''}
                    </option>
                  ))}
                </Select>
              </CardContent>
            </Card>

            {/* Loan Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('loanTerms')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Principal */}
                <Input
                  label={t('principalAmount')}
                  name="principal"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 50000"
                  value={form.principal}
                  onChange={handleChange}
                  required
                />

                {/* Collateral */}
                <Select
                  label={t('collateral')}
                  name="collateral"
                  value={form.collateral}
                  onChange={handleChange}
                >
                  <option value="ไม่มี">{t('collateralNone')}</option>
                  <option value="โฉนดที่ดิน">{t('collateralLandTitle')}</option>
                  <option value="เล่มทะเบียนรถ">{t('collateralVehicle')}</option>
                  <option value="ทอง">{t('collateralGold')}</option>
                  <option value="โทรศัพท์มือถือ">{t('collateralPhone')}</option>
                  <option value="บัตรข้าราชการ">{t('collateralGovCard')}</option>
                  <option value="อื่นๆ">{t('collateralOther')}</option>
                </Select>
                {form.collateral === 'อื่นๆ' && (
                  <Input
                    label={t('collateralSpecify')}
                    name="collateral_other"
                    value={form.collateral_other}
                    onChange={handleChange}
                    placeholder={t('collateralSpecifyPlaceholder')}
                    required
                  />
                )}

                {/* Interest Rate + Unit (side by side) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label={t('interestRatePercent')}
                    name="interest_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 5"
                    value={form.interest_rate}
                    onChange={handleChange}
                    required
                  />
                  <Select
                    label={t('rateUnit')}
                    name="interest_rate_unit"
                    value={form.interest_rate_unit}
                    onChange={handleChange}
                  >
                    <option value="daily">{t('daily')}</option>
                    <option value="monthly">{t('monthly')}</option>
                    <option value="yearly">{t('yearly')}</option>
                  </Select>
                </div>

                {/* Interest Method (flat only for now) */}
                <Select
                  label={t('interestMethod')}
                  name="interest_method"
                  value={form.interest_method}
                  onChange={handleChange}
                  disabled
                >
                  <option value="flat">{t('flat')}</option>
                </Select>

                {/* Term Length + Unit (side by side) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label={t('termLength')}
                    name="term_length"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 6"
                    value={form.term_length}
                    onChange={handleChange}
                    required
                  />
                  <Select
                    label={t('termUnit')}
                    name="term_unit"
                    value={form.term_unit}
                    onChange={handleChange}
                  >
                    <option value="days">{t('days')}</option>
                    <option value="months">{t('months')}</option>
                  </Select>
                </div>

                {/* Payment Frequency */}
                <Select
                  label={t('paymentFrequency')}
                  name="payment_frequency"
                  value={form.payment_frequency}
                  onChange={handleChange}
                >
                  <option value="daily">{t('daily')}</option>
                  <option value="weekly">{t('weekly')}</option>
                  <option value="monthly">{t('monthly')}</option>
                </Select>

                {/* Interest Behavior */}
                <Select
                  label={t('interestBehavior')}
                  name="interest_behavior"
                  value={form.interest_behavior}
                  onChange={handleChange}
                >
                  <option value="simple">{t('simple')}</option>
                  <option value="capitalize">{t('capitalize')}</option>
                </Select>

                {/* Disbursement Date */}
                <Input
                  label={t('disbursementDate')}
                  name="disbursed_at"
                  type="date"
                  value={form.disbursed_at}
                  onChange={handleChange}
                  required
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting || !form.borrower_id}>
                <FileSignature className="mr-2 h-4 w-4" />
                สร้างสัญญาและลงนาม
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>

          {/* ─── Live Preview Panel (right, 2 cols, sticky on desktop) ─── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6">
              <div className="overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 p-6 text-white shadow-lg">
                <div className="mb-5 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-white/80" />
                  <h3 className="text-lg font-semibold">{t('livePreview')}</h3>
                </div>

                {preview ? (
                  <div className="space-y-4">
                    {/* Interest Rate - displayed in the user's selected unit */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                        <Percent className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white/70">
                          {form.interest_rate_unit === 'daily' ? t('dailyRate') : form.interest_rate_unit === 'monthly' ? t('monthlyRate') : t('yearlyRate')}
                        </p>
                        <p className="text-lg font-bold">
                          {parseFloat(form.interest_rate || 0)}%
                        </p>
                        <p className="text-xs text-white/50">
                          ({(preview.dailyRate * 100).toFixed(4)}% {t('dailyEquivalent')})
                        </p>
                      </div>
                    </div>

                    {/* Total Interest */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white/70">{t('totalInterest')}</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(preview.totalInterest)}
                        </p>
                      </div>
                    </div>

                    {/* Total Payable */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white/70">{t('totalPayable')}</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(preview.totalPayable)}
                        </p>
                      </div>
                    </div>

                    <hr className="border-white/20" />

                    {/* Number of Installments */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                        <Hash className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white/70">{t('installments')}</p>
                        <p className="text-lg font-bold">
                          {preview.installmentCount} {t('payments')}
                        </p>
                      </div>
                    </div>

                    {/* Per Installment */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white/70">{t('perInstallment')}</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(preview.installmentAmount)}
                        </p>
                      </div>
                    </div>

                    {/* Loan Duration */}
                    <div className="mt-2 rounded-lg bg-white/10 px-4 py-3">
                      <p className="text-xs text-white/70">{t('loanDuration')}</p>
                      <p className="text-sm font-semibold">
                        {preview.totalDays} days ({form.term_length} {form.term_unit})
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Calculator className="mb-3 h-10 w-10 text-white/30" />
                    <p className="text-sm text-white/60">
                      {t('previewHint')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
