import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, MapPin, ExternalLink } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';

export default function BorrowerForm() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    registered_address: '',
    residential_address: '',
    work_address: '',
    lat: '',
    lng: '',
    registered_lat: '',
    registered_lng: '',
    residential_lat: '',
    residential_lng: '',
    work_lat: '',
    work_lng: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;

    const fetchBorrower = async () => {
      try {
        const res = await api.get(`/borrowers/${id}`);
        const b = res.data;
        setForm({
          name: b.name || '',
          phone: b.phone || '',
          registered_address: b.registered_address || '',
          residential_address: b.residential_address || '',
          work_address: b.work_address || '',
          lat: b.lat ?? '',
          lng: b.lng ?? '',
          registered_lat: b.registered_lat ?? '',
          registered_lng: b.registered_lng ?? '',
          residential_lat: b.residential_lat ?? '',
          residential_lng: b.residential_lng ?? '',
          work_lat: b.work_lat ?? '',
          work_lng: b.work_lng ?? '',
        });
      } catch (err) {
        setError(
          err.response?.data?.message || 'Failed to load borrower data.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBorrower();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Sync residential coords to primary lat/lng for backward compatibility
  useEffect(() => {
    if (form.residential_lat || form.residential_lng) {
      setForm(prev => ({ ...prev, lat: prev.residential_lat, lng: prev.residential_lng }));
    }
  }, [form.residential_lat, form.residential_lng]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...form,
        lat: form.lat !== '' ? parseFloat(form.lat) : null,
        lng: form.lng !== '' ? parseFloat(form.lng) : null,
        registered_lat: form.registered_lat !== '' ? parseFloat(form.registered_lat) : null,
        registered_lng: form.registered_lng !== '' ? parseFloat(form.registered_lng) : null,
        residential_lat: form.residential_lat !== '' ? parseFloat(form.residential_lat) : null,
        residential_lng: form.residential_lng !== '' ? parseFloat(form.residential_lng) : null,
        work_lat: form.work_lat !== '' ? parseFloat(form.work_lat) : null,
        work_lng: form.work_lng !== '' ? parseFloat(form.work_lng) : null,
      };

      if (isEdit) {
        await api.put(`/borrowers/${id}`, payload);
      } else {
        await api.post('/borrowers', payload);
      }

      navigate('/borrowers');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to save borrower.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const hasCoordinates = form.residential_lat !== '' && form.residential_lng !== '';
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${form.residential_lat},${form.residential_lng}`
    : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? t('editBorrower') : t('newBorrower')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEdit
              ? 'Update borrower information'
              : 'Add a new borrower to your records'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label={t('name')}
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="เช่น สมชาย ใจดี"
              required
            />
            <Input
              label={t('phone')}
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="เช่น 081-234-5678"
            />
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('addresses')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full">
              <label
                htmlFor="registered_address"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {t('registeredAddress')}
              </label>
              <textarea
                id="registered_address"
                name="registered_address"
                value={form.registered_address}
                onChange={handleChange}
                rows={3}
                placeholder="เช่น 99/5 หมู่ 3 ต.บางพลี อ.บางพลี จ.สมุทรปราการ 10540"
                className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
              />
            </div>
            <div className="w-full">
              <label
                htmlFor="residential_address"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {t('residentialAddress')}
              </label>
              <textarea
                id="residential_address"
                name="residential_address"
                value={form.residential_address}
                onChange={handleChange}
                rows={3}
                placeholder="เช่น 25/10 ซ.สุขุมวิท 77 แขวงอ่อนนุช เขตสวนหลวง กรุงเทพฯ 10250"
                className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
              />
            </div>
            <div className="w-full">
              <label htmlFor="work_address" className="mb-1.5 block text-sm font-medium text-gray-700">
                ที่อยู่ที่ทำงาน (Work Address)
              </label>
              <textarea
                id="work_address"
                name="work_address"
                value={form.work_address}
                onChange={handleChange}
                rows={3}
                placeholder="เช่น อาคารสีลมคอมเพล็กซ์ ชั้น 12 ถ.สีลม กรุงเทพฯ 10500"
                className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location / Google Maps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                {t('location')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              {t('addressHint')}
            </p>

            {/* Registered Address Coordinates */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">📍 พิกัดที่อยู่ตามทะเบียน</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Lat" name="registered_lat" type="number" step="any" value={form.registered_lat} onChange={handleChange} placeholder="เช่น 13.7563" />
                <Input label="Lng" name="registered_lng" type="number" step="any" value={form.registered_lng} onChange={handleChange} placeholder="เช่น 100.5018" />
              </div>
            </div>

            {/* Residential Address Coordinates */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">🏠 พิกัดที่อยู่ปัจจุบัน</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Lat" name="residential_lat" type="number" step="any" value={form.residential_lat} onChange={handleChange} placeholder="เช่น 13.7563" />
                <Input label="Lng" name="residential_lng" type="number" step="any" value={form.residential_lng} onChange={handleChange} placeholder="เช่น 100.5018" />
              </div>
            </div>

            {/* Work Address Coordinates */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">🏢 พิกัดที่อยู่ที่ทำงาน</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Lat" name="work_lat" type="number" step="any" value={form.work_lat} onChange={handleChange} placeholder="เช่น 13.7563" />
                <Input label="Lng" name="work_lng" type="number" step="any" value={form.work_lng} onChange={handleChange} placeholder="เช่น 100.5018" />
              </div>
            </div>
            {hasCoordinates && (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(mapsUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('openInGoogleMaps')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEdit ? t('updateBorrower') : t('createBorrower')}
          </Button>
        </div>
      </form>
    </div>
  );
}
