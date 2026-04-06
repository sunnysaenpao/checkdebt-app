import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useLang } from '@/contexts/LanguageContext';
import {
  Loader2, MapPin, Building2, User, Navigation, ExternalLink, Save, Pencil,
} from 'lucide-react';

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons
const lenderIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const borrowerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const selectedBorrowerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const registeredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const workIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// Calculate distance between two points (Haversine formula)
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Component to fly map to coordinates
function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 13, { duration: 1 }); }, [center, map]);
  return null;
}

// Draggable pin map for picking a location
function PickLocationMap({ lat, lng, onChange }) {
  const position = lat && lng ? [parseFloat(lat), parseFloat(lng)] : null;
  const center = position || [13.7563, 100.5018];

  function ClickHandler() {
    const map = useMap();
    useEffect(() => {
      const handler = (e) => {
        onChange(e.latlng.lat, e.latlng.lng);
      };
      map.on('click', handler);
      return () => map.off('click', handler);
    }, [map]);
    return null;
  }

  return (
    <div className="h-[280px] overflow-hidden rounded-lg border border-gray-300">
      <MapContainer center={center} zoom={position ? 15 : 12} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler />
        {position && (
          <Marker position={position} icon={lenderIcon}>
            <Popup>ตำแหน่งของคุณ</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default function MapView() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  // Lender location modal
  const [locModal, setLocModal] = useState(false);
  const [locForm, setLocForm] = useState({ address: '', lat: '', lng: '' });
  const [locSaving, setLocSaving] = useState(false);

  useEffect(() => {
    api.get('/map').then(({ data }) => {
      setData(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const borrowersWithCoords = useMemo(() => {
    if (!data) return [];
    return data.borrowers.filter((b) =>
      (b.lat && b.lng) ||
      (b.residential_lat && b.residential_lng) ||
      (b.registered_lat && b.registered_lng) ||
      (b.work_lat && b.work_lng)
    );
  }, [data]);

  const lender = data?.lender;
  const lenderHasCoords = lender?.lat && lender?.lng;

  // Distance from lender to selected borrower (residential address)
  const distance = useMemo(() => {
    if (!lenderHasCoords || !selectedBorrower) return null;
    const bLat = selectedBorrower.residential_lat || selectedBorrower.lat;
    const bLng = selectedBorrower.residential_lng || selectedBorrower.lng;
    if (!bLat || !bLng) return null;
    return calcDistance(lender.lat, lender.lng, bLat, bLng);
  }, [lender, selectedBorrower, lenderHasCoords]);

  // Line between lender and selected borrower (residential address)
  const connectionLine = useMemo(() => {
    if (!lenderHasCoords || !selectedBorrower) return null;
    const bLat = selectedBorrower.residential_lat || selectedBorrower.lat;
    const bLng = selectedBorrower.residential_lng || selectedBorrower.lng;
    if (!bLat || !bLng) return null;
    return [[lender.lat, lender.lng], [bLat, bLng]];
  }, [lender, selectedBorrower, lenderHasCoords]);

  // Map center
  const defaultCenter = useMemo(() => {
    if (lenderHasCoords) return [lender.lat, lender.lng];
    if (borrowersWithCoords.length > 0) {
      const b0 = borrowersWithCoords[0];
      return [b0.residential_lat || b0.lat, b0.residential_lng || b0.lng];
    }
    return [13.7563, 100.5018]; // กรุงเทพฯ default
  }, [lender, borrowersWithCoords, lenderHasCoords]);

  const openLocModal = () => {
    setLocForm({
      address: lender?.address || '',
      lat: lender?.lat || '',
      lng: lender?.lng || '',
    });
    setLocModal(true);
  };

  const saveLenderLocation = async () => {
    setLocSaving(true);
    try {
      const res = await api.put('/map/lender-location', locForm);
      setData((prev) => ({ ...prev, lender: { ...prev.lender, ...res.data } }));
      setLocModal(false);
    } catch { }
    setLocSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('map')}</h1>
          <p className="mt-1 text-sm text-gray-500">View lender and borrower locations with distances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openLocModal}>
            <Pencil className="mr-1 h-4 w-4" />
            {lenderHasCoords ? 'Update My Location' : 'Set My Location'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Borrower List (left panel) */}
        <div className="lg:col-span-1 space-y-3">
          {/* Legend */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" /> ผู้ให้กู้ (Lender)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500" /> ที่อยู่ปัจจุบัน (Residential)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange-500" /> ที่อยู่ตามทะเบียน (Registered)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-purple-500" /> ที่อยู่ทำงาน (Work)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-500" /> เลือกอยู่ (Selected)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* When a borrower is selected: show their full detail */}
          {selectedBorrower ? (
            <>
              {/* Back button + borrower name */}
              <Card>
                <CardContent className="p-4">
                  <button
                    onClick={() => setSelectedBorrower(null)}
                    className="mb-2 text-xs font-medium text-blue-600 hover:underline"
                  >
                    ← กลับไปรายการทั้งหมด
                  </button>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{selectedBorrower.name}</p>
                      <p className="text-sm text-gray-500">{selectedBorrower.phone}</p>
                    </div>
                    <Link
                      to={`/borrowers/${selectedBorrower.id}`}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      ดูรายละเอียด →
                    </Link>
                  </div>
                  {distance !== null && (
                    <div className="mt-3 rounded-lg bg-green-50 p-3">
                      <p className="text-xs text-green-700">ระยะห่าง (ที่อยู่ปัจจุบัน)</p>
                      <p className="text-xl font-bold text-green-800">{distance.toFixed(2)} km</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address cards */}
              {[
                {
                  label: '📍 ที่อยู่ตามทะเบียน',
                  sublabel: 'Registered Address',
                  address: selectedBorrower.registered_address,
                  lat: selectedBorrower.registered_lat,
                  lng: selectedBorrower.registered_lng,
                  color: 'orange',
                },
                {
                  label: '🏠 ที่อยู่ปัจจุบัน',
                  sublabel: 'Residential Address',
                  address: selectedBorrower.residential_address,
                  lat: selectedBorrower.residential_lat || selectedBorrower.lat,
                  lng: selectedBorrower.residential_lng || selectedBorrower.lng,
                  color: 'blue',
                },
                {
                  label: '🏢 ที่อยู่ที่ทำงาน',
                  sublabel: 'Work Address',
                  address: selectedBorrower.work_address,
                  lat: selectedBorrower.work_lat,
                  lng: selectedBorrower.work_lng,
                  color: 'purple',
                },
              ].filter((a) => a.address).map((addr) => {
                const hasCrd = addr.lat && addr.lng;
                const dist = hasCrd && lenderHasCoords ? calcDistance(lender.lat, lender.lng, addr.lat, addr.lng) : null;
                return (
                  <Card key={addr.sublabel} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className={`border-l-4 ${
                        addr.color === 'orange' ? 'border-orange-400' :
                        addr.color === 'purple' ? 'border-purple-400' : 'border-blue-400'
                      } p-3`}>
                        <p className="text-xs font-semibold text-gray-700">{addr.label}</p>
                        <p className="mt-1 text-sm text-gray-800">{addr.address}</p>
                        {hasCrd && (
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              📌 {addr.lat}, {addr.lng}
                              {dist !== null && <span className="ml-2 font-semibold text-green-700">({dist.toFixed(1)} km)</span>}
                            </p>
                            <a
                              href={lenderHasCoords
                                ? `https://www.google.com/maps/dir/${lender.lat},${lender.lng}/${addr.lat},${addr.lng}`
                                : `https://www.google.com/maps/search/?api=1&query=${addr.lat},${addr.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-600 hover:text-white"
                            >
                              <Navigation className="h-3 w-3" /> นำทาง
                            </a>
                          </div>
                        )}
                        {!hasCrd && (
                          <p className="mt-1 text-xs text-gray-400">ยังไม่ได้ระบุพิกัด</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          ) : (
            <>
              {/* Borrower list (default view) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ผู้กู้ ({borrowersWithCoords.length})</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto p-0">
                  {borrowersWithCoords.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-gray-500">
                      ยังไม่มีผู้กู้ที่มีพิกัด
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {borrowersWithCoords.map((b) => {
                        const dist = lenderHasCoords
                          ? calcDistance(lender.lat, lender.lng, b.residential_lat || b.lat, b.residential_lng || b.lng)
                          : null;
                        return (
                          <button
                            key={b.id}
                            onClick={() => {
                              setSelectedBorrower(b);
                              setFlyTarget([b.residential_lat || b.lat, b.residential_lng || b.lng]);
                            }}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-blue-50"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{b.name}</p>
                                <p className="text-xs text-gray-500">{b.phone}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  {dist !== null && (
                                    <p className={`text-xs font-semibold ${dist > 50 ? 'text-red-600' : dist > 20 ? 'text-orange-600' : 'text-green-600'}`}>
                                      {dist.toFixed(1)} km
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400">{b.loan_count} สินเชื่อ</p>
                                </div>
                                <a
                                  href={lenderHasCoords
                                    ? `https://www.google.com/maps/dir/${lender.lat},${lender.lng}/${b.residential_lat || b.lat},${b.residential_lng || b.lng}`
                                    : `https://www.google.com/maps/search/?api=1&query=${b.residential_lat || b.lat},${b.residential_lng || b.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
                                  title="นำทาง Google Maps"
                                >
                                  <Navigation className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Borrowers without coordinates */}
          {data?.borrowers.filter(b => !(b.lat && b.lng) && !(b.residential_lat && b.residential_lng) && !(b.registered_lat && b.registered_lng) && !(b.work_lat && b.work_lng)).length > 0 && (
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">
                  {data.borrowers.filter(b => !(b.lat && b.lng) && !(b.residential_lat && b.residential_lng) && !(b.registered_lat && b.registered_lng) && !(b.work_lat && b.work_lng)).length} borrower(s) without coordinates.{' '}
                  <Link to="/borrowers" className="text-blue-600 hover:underline">Edit them</Link> to add lat/lng.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map (right panel) */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="h-[600px]">
              <MapContainer center={defaultCenter} zoom={11} className="h-full w-full" scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FlyTo center={flyTarget} />

                {/* Lender marker */}
                {lenderHasCoords && (
                  <Marker position={[lender.lat, lender.lng]} icon={lenderIcon}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold text-red-700">📍 {lender.name} (You)</p>
                        {lender.address && <p className="mt-1 text-gray-600">{lender.address}</p>}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Borrower markers — show all when none selected, only selected borrower's addresses when one is chosen */}
                {(() => {
                  // If a borrower is selected, only show their markers; otherwise show all
                  // When a borrower is selected: show ONLY that borrower with ALL their address pins
                  // When none selected: show only residential pins for all borrowers (less clutter)
                  const displayBorrowers = selectedBorrower
                    ? borrowersWithCoords.filter((b) => b.id === selectedBorrower.id)
                    : borrowersWithCoords;

                  return displayBorrowers.flatMap((b) => {
                    const isSelected = selectedBorrower?.id === b.id;

                    const addressTypes = [
                      {
                        key: 'residential',
                        lat: b.residential_lat || b.lat,
                        lng: b.residential_lng || b.lng,
                        label: '🏠 ที่อยู่ปัจจุบัน',
                        address: b.residential_address,
                        icon: isSelected ? selectedBorrowerIcon : borrowerIcon,
                        show: true, // always show residential
                      },
                      {
                        key: 'registered',
                        lat: b.registered_lat,
                        lng: b.registered_lng,
                        label: '📍 ที่อยู่ตามทะเบียน',
                        address: b.registered_address,
                        icon: registeredIcon,
                        show: isSelected, // only show when this borrower is selected
                      },
                      {
                        key: 'work',
                        lat: b.work_lat,
                        lng: b.work_lng,
                        label: '🏢 ที่อยู่ที่ทำงาน',
                        address: b.work_address,
                        icon: workIcon,
                        show: isSelected, // only show when this borrower is selected
                      },
                    ];

                    return addressTypes
                      .filter(({ lat, lng, show }) => show && lat && lng)
                      .map(({ key, lat, lng, label, address, icon }) => (
                        <Marker
                          key={`${b.id}-${key}`}
                          position={[lat, lng]}
                          icon={icon}
                          eventHandlers={{
                            click: () => setSelectedBorrower(isSelected ? null : b),
                          }}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-bold text-blue-700">{b.name}</p>
                              <p className="text-xs font-medium text-gray-700">{label}</p>
                              <p className="text-gray-500">{b.phone}</p>
                              {address && (
                                <p className="mt-1 text-xs text-gray-600">{address}</p>
                              )}
                              {lenderHasCoords && (
                                <p className="mt-1 text-xs font-semibold text-green-700">
                                  {calcDistance(lender.lat, lender.lng, lat, lng).toFixed(2)} km จากคุณ
                                </p>
                              )}
                              <div className="mt-2 flex gap-2">
                                <a href={`/borrowers/${b.id}`} className="text-xs text-blue-600 hover:underline">
                                  ดูรายละเอียด →
                                </a>
                                <a
                                  href={lenderHasCoords
                                    ? `https://www.google.com/maps/dir/${lender.lat},${lender.lng}/${lat},${lng}`
                                    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-green-600 hover:underline"
                                >
                                  📍 นำทาง
                                </a>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ));
                  });
                })()}

                {/* Distance line between lender and selected borrower */}
                {connectionLine && (
                  <Polyline
                    positions={connectionLine}
                    pathOptions={{ color: '#22c55e', weight: 3, dashArray: '8,8' }}
                  />
                )}
              </MapContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Set Lender Location Modal */}
      <Modal open={locModal} onClose={() => setLocModal(false)} title="Set Your Location">
        <div className="space-y-4">
          {/* Clickable map to drop pin — outside form to avoid event conflicts */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">คลิกบนแผนที่เพื่อปักหมุดตำแหน่งของคุณ</p>
            <PickLocationMap
              lat={locForm.lat}
              lng={locForm.lng}
              onChange={(lat, lng) => setLocForm((p) => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
            />
          </div>

          <Input
            label="Address (ที่อยู่)"
            value={locForm.address}
            onChange={(e) => setLocForm((p) => ({ ...p, address: e.target.value }))}
            placeholder="เช่น 123/45 ถ.สุขุมวิท กรุงเทพฯ 10110"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitude (ละติจูด)"
              type="number"
              step="any"
              value={locForm.lat}
              onChange={(e) => setLocForm((p) => ({ ...p, lat: e.target.value }))}
              placeholder="เช่น 13.7563"
            />
            <Input
              label="Longitude (ลองจิจูด)"
              type="number"
              step="any"
              value={locForm.lng}
              onChange={(e) => setLocForm((p) => ({ ...p, lng: e.target.value }))}
              placeholder="เช่น 100.5018"
            />
          </div>
          <p className="text-xs text-gray-500">
            คลิกบนแผนที่ด้านบนเพื่อปักหมุด หรือพิมพ์พิกัดด้วยตนเอง
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setLocModal(false)}>Cancel</Button>
            <Button
              onClick={saveLenderLocation}
              disabled={locSaving || !locForm.lat || !locForm.lng}
            >
              {locSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {locSaving ? 'Saving...' : 'Save Location'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
