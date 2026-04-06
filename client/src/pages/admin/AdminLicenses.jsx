import { useState, useEffect, useCallback } from 'react';
import adminApi from '@/lib/adminApi';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  KeyRound, Plus, Trash2, Copy, Check, Loader2, AlertTriangle,
} from 'lucide-react';

const PLAN_VARIANT = {
  monthly: 'secondary',
  quarterly: 'default',
  semiannual: 'warning',
  yearly: 'success',
};

const PLAN_LABEL = {
  monthly: '1 Month',
  quarterly: '3 Months',
  semiannual: '6 Months',
  yearly: '12 Months',
};

const PLAN_DAYS = {
  monthly: '30 days',
  quarterly: '90 days',
  semiannual: '180 days',
  yearly: '365 days',
};

export default function AdminLicenses() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [genPlan, setGenPlan] = useState('monthly');
  const [genQty, setGenQty] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [newCodes, setNewCodes] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.get('/licenses');
      setLicenses(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load licenses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLicenses(); }, [fetchLicenses]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await adminApi.post('/licenses', {
        plan: genPlan,
        quantity: Number(genQty),
      });
      setNewCodes(data);
      fetchLicenses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate codes.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this license code?')) return;
    try {
      await adminApi.delete(`/licenses/${id}`);
      setLicenses((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete.');
    }
  };

  const handleCopy = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllNew = () => {
    const text = newCodes.map((c) => c.code).join('\n');
    handleCopy(text, 'all');
  };

  const closeModal = () => {
    setModalOpen(false);
    setNewCodes([]);
    setGenPlan('monthly');
    setGenQty(1);
  };

  // Stats
  const totalCodes = licenses.length;
  const usedCodes = licenses.filter((l) => l.is_used).length;
  const availableCodes = totalCodes - usedCodes;

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
        <AlertTriangle className="mb-3 h-10 w-10 text-red-400" />
        <p className="font-medium text-red-600">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchLicenses}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Codes</h1>
          <p className="mt-1 text-sm text-gray-500">Generate and manage license codes for lenders</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} className="mr-1" />
          Generate Codes
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{totalCodes}</p>
            <p className="text-xs text-gray-500">Total Codes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{availableCodes}</p>
            <p className="text-xs text-gray-500">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{usedCodes}</p>
            <p className="text-xs text-gray-500">Used</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound size={20} />
            All License Codes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {licenses.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              No license codes yet. Click "Generate Codes" to create some.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Used At</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.map((lic) => (
                    <TableRow key={lic.id}>
                      <TableCell>
                        <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono font-medium text-gray-800">
                          {lic.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={PLAN_VARIANT[lic.plan] || 'secondary'}>
                          {PLAN_LABEL[lic.plan] || lic.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {PLAN_DAYS[lic.plan] || `${lic.duration_days}d`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={lic.is_used ? 'secondary' : 'success'}>
                          {lic.is_used ? 'Used' : 'Available'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {lic.used_by_name || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {lic.used_at ? formatDate(lic.used_at) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(lic.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(lic.code, lic.id)}
                            title="Copy code"
                          >
                            {copiedId === lic.id ? (
                              <Check size={14} className="text-green-600" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </Button>
                          {!lic.is_used && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(lic.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete code"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Modal */}
      <Modal open={modalOpen} onClose={closeModal} title="Generate License Codes">
        {newCodes.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="mb-3 text-sm font-medium text-green-800">
                {newCodes.length} code{newCodes.length > 1 ? 's' : ''} generated!
              </p>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {newCodes.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded bg-white px-3 py-2 font-mono text-sm text-gray-800"
                  >
                    <span>{c.code}</span>
                    <button
                      onClick={() => handleCopy(c.code, `new-${i}`)}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      {copiedId === `new-${i}` ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleCopyAllNew}>
                <Copy size={14} className="mr-1" /> Copy All
              </Button>
              <Button className="flex-1" onClick={closeModal}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Select a plan type and how many codes to generate.
            </p>

            <Select label="License Plan" value={genPlan} onChange={(e) => setGenPlan(e.target.value)}>
              <option value="monthly">1 Month (30 days)</option>
              <option value="quarterly">3 Months (90 days)</option>
              <option value="semiannual">6 Months (180 days)</option>
              <option value="yearly">12 Months (365 days)</option>
            </Select>

            <Input
              label="Quantity"
              type="number"
              min={1}
              max={50}
              value={genQty}
              onChange={(e) => setGenQty(e.target.value)}
            />

            <div className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-600">
              Each code can be redeemed once by a lender to activate their subscription for the selected duration.
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={handleGenerate}
                disabled={generating || genQty < 1 || genQty > 50}
              >
                {generating ? (
                  <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Plus size={16} className="mr-1" /> Generate</>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
