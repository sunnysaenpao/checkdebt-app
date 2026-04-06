import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLang } from '@/contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Loader2,
  ArrowLeft,
  Edit,
  ExternalLink,
  MapPin,
  Phone,
  Home,
  Plus,
  Upload,
  Download,
  Trash2,
  FileText,
} from 'lucide-react';

const STATUS_VARIANT = {
  active: 'default',
  completed: 'success',
  defaulted: 'danger',
};

export default function BorrowerDetail() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef(null);

  const [borrower, setBorrower] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Document upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchBorrower = async () => {
    try {
      const res = await api.get(`/borrowers/${id}`);
      setBorrower(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load borrower.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrower();
  }, [id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post(`/documents/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Refresh borrower data to get updated documents list
      await fetchBorrower();
    } catch (err) {
      setUploadError(
        err.response?.data?.message || 'Failed to upload document.'
      );
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    setDeleting(docId);
    try {
      await api.delete(`/documents/${docId}`);
      await fetchBorrower();
    } catch (err) {
      setUploadError(
        err.response?.data?.message || 'Failed to delete document.'
      );
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasCoordinates = borrower?.lat != null && borrower?.lng != null;
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${borrower.lat},${borrower.lng}`
    : null;

  const hasRegisteredCoords = borrower?.registered_lat != null && borrower?.registered_lng != null;
  const registeredMapsUrl = hasRegisteredCoords
    ? `https://www.google.com/maps/search/?api=1&query=${borrower.registered_lat},${borrower.registered_lng}`
    : null;

  const hasResidentialCoords = borrower?.residential_lat != null && borrower?.residential_lng != null;
  const residentialMapsUrl = hasResidentialCoords
    ? `https://www.google.com/maps/search/?api=1&query=${borrower.residential_lat},${borrower.residential_lng}`
    : null;

  const hasWorkCoords = borrower?.work_lat != null && borrower?.work_lng != null;
  const workMapsUrl = hasWorkCoords
    ? `https://www.google.com/maps/search/?api=1&query=${borrower.work_lat},${borrower.work_lng}`
    : null;

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

  if (!borrower) return null;

  const loans = borrower.loans || [];
  const documents = borrower.documents || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/borrowers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {borrower.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t('borrowerDetail')}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/borrowers/${id}/edit`)}
        >
          <Edit className="mr-2 h-4 w-4" />
          {t('edit')}
        </Button>
      </div>

      {/* Borrower Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-5">
            {/* Phone */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('phone')}</p>
                <p className="mt-0.5 text-sm text-gray-900">
                  {borrower.phone || 'Not provided'}
                </p>
              </div>
            </div>

            {/* Address Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Registered Address */}
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">📍</span>
                  <p className="text-sm font-semibold text-gray-700">
                    {t('registeredAddress')}
                  </p>
                </div>
                <p className="whitespace-pre-line text-sm text-gray-900 mb-2">
                  {borrower.registered_address || 'Not provided'}
                </p>
                {hasRegisteredCoords ? (
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {borrower.registered_lat}, {borrower.registered_lng}
                    </span>
                    <button
                      onClick={() => window.open(registeredMapsUrl, '_blank')}
                      className="ml-auto inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      นำทาง
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">ยังไม่ได้ระบุพิกัด</p>
                )}
              </div>

              {/* Residential Address */}
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🏠</span>
                  <p className="text-sm font-semibold text-gray-700">
                    {t('residentialAddress')}
                  </p>
                </div>
                <p className="whitespace-pre-line text-sm text-gray-900 mb-2">
                  {borrower.residential_address || 'Not provided'}
                </p>
                {hasResidentialCoords ? (
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {borrower.residential_lat}, {borrower.residential_lng}
                    </span>
                    <button
                      onClick={() => window.open(residentialMapsUrl, '_blank')}
                      className="ml-auto inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      นำทาง
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">ยังไม่ได้ระบุพิกัด</p>
                )}
              </div>

              {/* Work Address - only show if work_address exists */}
              {borrower.work_address && (
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">🏢</span>
                    <p className="text-sm font-semibold text-gray-700">
                      ที่อยู่ที่ทำงาน
                    </p>
                  </div>
                  <p className="whitespace-pre-line text-sm text-gray-900 mb-2">
                    {borrower.work_address}
                  </p>
                  {hasWorkCoords ? (
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {borrower.work_lat}, {borrower.work_lng}
                      </span>
                      <button
                        onClick={() => window.open(workMapsUrl, '_blank')}
                        className="ml-auto inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        นำทาง
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">ยังไม่ได้ระบุพิกัด</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('loans')}</CardTitle>
            <Button
              size="sm"
              onClick={() => navigate(`/loans/new?borrower=${id}`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('newLoan')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>{t('principal')}</TableHead>
                  <TableHead>{t('totalPayable')}</TableHead>
                  <TableHead>{t('outstanding')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow
                    key={loan.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/loans/${loan.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-gray-500">
                      {loan.id?.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(loan.principal)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(loan.total_payable)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(loan.outstanding_balance)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT[loan.status] || 'secondary'}
                      >
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
              {t('noLoans')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('documents')}</CardTitle>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="doc-upload"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? 'Uploading...' : t('uploadDocument')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {uploadError && (
            <div className="mx-6 mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {uploadError}
            </div>
          )}

          {documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('fileName')}</TableHead>
                  <TableHead>{t('fileSize')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {doc.original_name || doc.filename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatFileSize(doc.size)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(doc.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/uploads/${doc.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleting === doc.id}
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          {deleting === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              {t('noDocuments')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
