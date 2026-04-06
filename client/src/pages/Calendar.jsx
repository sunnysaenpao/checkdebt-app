import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  ExternalLink,
  Users,
} from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';

const DAY_NAMES = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  th: ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'],
};
const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  th: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
};

const STATUS_COLOR = {
  pending: 'bg-blue-100 text-blue-800 border-blue-200',
  partial: 'bg-amber-100 text-amber-800 border-amber-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
};

// Build the 6-week grid of dates for a month (Mon-start)
function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday=0 ... Sunday=6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days = [];
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDow);

  // Always show 6 weeks (42 days) for consistent grid
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  return { days, firstDay, lastDay };
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isToday(d) {
  return isSameDay(d, new Date());
}

export default function Calendar() {
  const { t, lang } = useLang();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [data, setData] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [selectedBorrower, setSelectedBorrower] = useState('');
  const [loading, setLoading] = useState(true);

  // Day detail modal
  const [dayModal, setDayModal] = useState({ open: false, date: null, items: [] });

  // Navigate months
  const goBack = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const goForward = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  // Fetch borrowers once
  useEffect(() => {
    api.get('/calendar/borrowers').then((res) => setBorrowers(res.data)).catch(() => {});
  }, []);

  // Fetch schedule data whenever month changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const from = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const to = new Date(year, month + 2, 0).toISOString().split('T')[0];
      try {
        const res = await api.get('/calendar', { params: { from, to } });
        setData(res.data);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year, month]);

  // Build calendar grid
  const { days } = useMemo(() => getCalendarDays(year, month), [year, month]);

  // Filter data by selected borrower
  const filteredData = useMemo(() => {
    if (!selectedBorrower) return data;
    return data.filter((d) => d.borrower_id === selectedBorrower);
  }, [data, selectedBorrower]);

  // Group events by date string
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const item of filteredData) {
      const key = new Date(item.due_date).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [filteredData]);

  const getItemStatus = (item) => {
    if (item.is_overdue) return 'overdue';
    return item.status || 'pending';
  };

  const openDayDetail = (date, items) => {
    setDayModal({ open: true, date, items });
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('paymentCalendar')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('calendarSubtitle')}</p>
        </div>

        {/* Borrower filter */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <Select
            value={selectedBorrower}
            onChange={(e) => setSelectedBorrower(e.target.value)}
            className="w-52"
          >
            <option value="">{t('allBorrowers')}</option>
            {borrowers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Calendar card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Month navigation */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goForward}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToday}>
              {t('today')}
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {MONTH_NAMES[lang][month]} {year}
          </h2>
          <div className="text-sm text-gray-500">
            {filteredData.length} {t('payments')}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Day name headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {DAY_NAMES[lang].map((name) => (
                <div
                  key={name}
                  className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Day cells grid */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const isCurrentMonth = day.getMonth() === month;
                const todayClass = isToday(day);
                const dateKey = day.toDateString();
                const events = eventsByDate[dateKey] || [];
                const hasOverdue = events.some((e) => e.is_overdue);

                return (
                  <div
                    key={i}
                    onClick={() => events.length > 0 && openDayDetail(day, events)}
                    className={`
                      relative min-h-[100px] border-b border-r border-gray-100 p-1.5
                      transition-colors
                      ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/70'}
                      ${events.length > 0 ? 'cursor-pointer hover:bg-blue-50/50' : ''}
                      ${todayClass ? 'bg-blue-50/40' : ''}
                    `}
                  >
                    {/* Day number */}
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={`
                          inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                          ${todayClass ? 'bg-blue-600 text-white' : ''}
                          ${!todayClass && isCurrentMonth ? 'text-gray-900' : ''}
                          ${!todayClass && !isCurrentMonth ? 'text-gray-400' : ''}
                        `}
                      >
                        {day.getDate()}
                      </span>
                      {hasOverdue && (
                        <span className="h-2 w-2 rounded-full bg-red-500" title={t('overdue')} />
                      )}
                    </div>

                    {/* Event pills - show up to 3, then "+N more" */}
                    <div className="space-y-0.5">
                      {events.slice(0, 3).map((ev) => {
                        const st = getItemStatus(ev);
                        return (
                          <div
                            key={ev.id}
                            className={`truncate rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight ${STATUS_COLOR[st]}`}
                            title={`${ev.borrower_name} - ${formatCurrency(ev.total_due)}`}
                          >
                            {ev.borrower_name} &middot; {formatCurrency(ev.total_due)}
                          </div>
                        );
                      })}
                      {events.length > 3 && (
                        <div className="px-1.5 text-[10px] font-medium text-gray-500">
                          +{events.length - 3} {t('more')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Mini legend */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400" /> {t('pending')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> {t('partial')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" /> {t('paid')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> {t('overdue')}
        </span>
      </div>

      {/* ─── Day Detail Modal ─── */}
      <Modal
        open={dayModal.open}
        onClose={() => setDayModal({ open: false, date: null, items: [] })}
        title={
          dayModal.date
            ? dayModal.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : t('dayDetails')
        }
      >
        {dayModal.items.length > 0 && (
          <div className="space-y-3">
            {dayModal.items.map((item) => {
              const st = getItemStatus(item);
              const paid = (item.interest_paid || 0) + (item.principal_paid || 0);
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-4 ${
                    st === 'overdue' ? 'border-red-200 bg-red-50' :
                    st === 'paid' ? 'border-green-200 bg-green-50' :
                    st === 'partial' ? 'border-amber-200 bg-amber-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/borrowers/${item.borrower_id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600"
                        onClick={() => setDayModal({ open: false, date: null, items: [] })}
                      >
                        {item.borrower_name}
                      </Link>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {t('installment')} #{item.installment}
                      </p>
                    </div>
                    <Badge variant={st === 'overdue' ? 'danger' : st === 'paid' ? 'success' : st === 'partial' ? 'warning' : 'default'}>
                      {st}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500">{t('amountDue')}</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(item.total_due)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('principal')}</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(item.principal_due)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('totalInterest')}</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(item.interest_due)}</p>
                    </div>
                  </div>

                  {paid > 0 && (
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500">{t('paid')}: </span>
                      <span className="font-semibold text-green-700">{formatCurrency(paid)}</span>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Link
                      to={`/loans/${item.loan_id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      onClick={() => setDayModal({ open: false, date: null, items: [] })}
                    >
                      {t('viewLoan')} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
