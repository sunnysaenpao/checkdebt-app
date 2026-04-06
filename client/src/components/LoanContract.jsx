import { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// Map English enum values to Thai for contract text
const INTEREST_UNIT_TH = {
  daily: 'วัน',
  monthly: 'เดือน',
  yearly: 'ปี',
};

const FREQUENCY_TH = {
  daily: 'วัน',
  weekly: 'สัปดาห์',
  monthly: 'เดือน',
};

const TERM_UNIT_TH = {
  days: 'วัน',
  months: 'เดือน',
};

function formatThaiDate(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const day = date.getDate();
  const month = THAI_MONTHS[date.getMonth()];
  const buddhistYear = date.getFullYear() + 543;
  return `${day} ${month} พ.ศ. ${buddhistYear}`;
}

function formatBaht(num) {
  if (num == null) return '0.00';
  return Number(num).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function computeFirstDueDate(disbursedAt, frequency) {
  const result = disbursedAt ? new Date(disbursedAt) : new Date();
  switch (frequency) {
    case 'daily': result.setDate(result.getDate() + 1); break;
    case 'weekly': result.setDate(result.getDate() + 7); break;
    case 'monthly': result.setMonth(result.getMonth() + 1); break;
    default: result.setMonth(result.getMonth() + 1);
  }
  return formatThaiDate(result);
}

function SignaturePad({ label, nameEditable, nameValue, onNameChange, sigRef, onClear }) {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-3 text-sm font-bold text-gray-800">{label}</p>
      <div className="rounded-md border-2 border-gray-300 bg-white shadow-sm">
        <SignatureCanvas
          ref={sigRef}
          penColor="#1a1a1a"
          canvasProps={{
            width: 280,
            height: 120,
            className: 'rounded-md',
            style: { backgroundColor: '#ffffff' },
          }}
        />
      </div>
      <Button variant="ghost" size="sm" onClick={onClear} type="button" className="mt-1 text-xs text-gray-500">
        ล้างลายเซ็น
      </Button>
      <p className="text-xs text-gray-400 tracking-widest mb-1">........................................</p>
      <p className="text-xs text-gray-500">( {nameValue || '                              '} )</p>
      {nameEditable && (
        <Input
          placeholder="กรอกชื่อ-นามสกุล"
          value={nameValue}
          onChange={onNameChange}
          className="mt-1 max-w-[280px] text-center text-sm"
        />
      )}
    </div>
  );
}

export default function LoanContract({ lender, borrower, loanTerms, onComplete, onCancel }) {
  const lenderSigRef = useRef(null);
  const borrowerSigRef = useRef(null);
  const witness1SigRef = useRef(null);
  const witness2SigRef = useRef(null);

  const [witness1Name, setWitness1Name] = useState('');
  const [witness2Name, setWitness2Name] = useState('');
  const [validationError, setValidationError] = useState('');

  const {
    principal, interest_rate, interest_rate_unit,
    term_length, term_unit, payment_frequency,
    total_interest, total_payable,
    installment_count, installment_amount, disbursed_at, collateral,
  } = loanTerms;

  const contractDate = formatThaiDate(disbursed_at);
  const firstDueDate = computeFirstDueDate(disbursed_at, payment_frequency);
  const unitTh = INTEREST_UNIT_TH[interest_rate_unit] || interest_rate_unit;
  const freqTh = FREQUENCY_TH[payment_frequency] || payment_frequency;
  const termUnitTh = TERM_UNIT_TH[term_unit] || term_unit;

  function handleClear(ref) { ref.current?.clear(); }

  function handleConfirm() {
    const empty = [lenderSigRef, borrowerSigRef, witness1SigRef, witness2SigRef].some(r => r.current?.isEmpty());
    if (empty) { setValidationError('กรุณาลงลายมือชื่อให้ครบทุกช่อง'); return; }
    if (!witness1Name.trim() || !witness2Name.trim()) { setValidationError('กรุณากรอกชื่อพยานให้ครบ'); return; }
    setValidationError('');

    onComplete({
      lender: lenderSigRef.current.toDataURL('image/png'),
      borrower: borrowerSigRef.current.toDataURL('image/png'),
      witness1: witness1SigRef.current.toDataURL('image/png'),
      witness2: witness2SigRef.current.toDataURL('image/png'),
      witness1_name: witness1Name,
      witness2_name: witness2Name,
    });
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none">

        {/* Contract Document */}
        <div className="px-10 py-12 md:px-16 md:py-16" style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif", lineHeight: '2' }}>

          {/* ─── Header ─── */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-wide mb-2">สัญญากู้ยืมเงิน</h1>
            <div className="w-24 h-0.5 bg-gray-800 mx-auto mb-4" />
            <p className="text-sm text-gray-600">เขียนที่ {lender.address || '........................................'}</p>
            <p className="text-sm text-gray-600">วันที่ {contractDate}</p>
          </div>

          {/* ─── Preamble ─── */}
          <p className="text-base indent-12 mb-4">
            สัญญาฉบับนี้ทำขึ้นระหว่าง
          </p>

          {/* ─── Lender Party ─── */}
          <div className="mb-4 pl-12">
            <p className="text-base">
              <span className="font-bold">ผู้ให้กู้: </span>
              {lender.name} ที่อยู่ {lender.address || '..........................................'}{' '}
              ซึ่งต่อไปในสัญญานี้เรียกว่า <span className="font-bold">&quot;ผู้ให้กู้&quot;</span>
            </p>
          </div>

          {/* ─── Borrower Party ─── */}
          <div className="mb-6 pl-12">
            <p className="text-base">
              <span className="font-bold">ผู้กู้: </span>
              {borrower.name} หมายเลขโทรศัพท์ {borrower.phone}{' '}
              ที่อยู่ตามทะเบียน {borrower.registered_address}{' '}
              ที่อยู่ปัจจุบัน {borrower.residential_address}{' '}
              ซึ่งต่อไปในสัญญานี้เรียกว่า <span className="font-bold">&quot;ผู้กู้&quot;</span>
            </p>
          </div>

          <p className="text-base indent-12 mb-6">
            ทั้งสองฝ่ายตกลงทำสัญญากู้ยืมเงินกัน โดยมีข้อความและเงื่อนไขดังต่อไปนี้
          </p>

          {/* ─── Clause 1: Loan Amount ─── */}
          <p className="text-base indent-12 mb-4">
            <span className="font-bold">ข้อ 1. จำนวนเงินกู้</span>{' '}
            ผู้กู้ได้กู้ยืมเงินจากผู้ให้กู้เป็นจำนวนเงิน{' '}
            <span className="font-bold underline">{formatBaht(principal)}</span> บาท{' '}
            และผู้กู้ได้รับเงินจำนวนดังกล่าวไว้ครบถ้วนแล้วในวันทำสัญญานี้
          </p>

          {/* ─── Clause 2: Interest ─── */}
          <p className="text-base indent-12 mb-4">
            <span className="font-bold">ข้อ 2. อัตราดอกเบี้ย</span>{' '}
            ผู้กู้ตกลงชำระดอกเบี้ยในอัตราร้อยละ{' '}
            <span className="font-bold underline">{interest_rate}</span> ต่อ{unitTh}{' '}
            คิดเป็นดอกเบี้ยรวมทั้งสิ้น{' '}
            <span className="font-bold underline">{formatBaht(total_interest)}</span> บาท{' '}
            รวมเป็นเงินที่ต้องชำระทั้งหมด{' '}
            <span className="font-bold underline">{formatBaht(total_payable)}</span> บาท
          </p>

          {/* ─── Clause 3: Repayment ─── */}
          <p className="text-base indent-12 mb-4">
            <span className="font-bold">ข้อ 3. การชำระคืน</span>{' '}
            ผู้กู้ตกลงชำระเงินคืนเป็นงวด จำนวน{' '}
            <span className="font-bold underline">{installment_count}</span> งวด{' '}
            งวดละ <span className="font-bold underline">{formatBaht(installment_amount)}</span> บาท{' '}
            กำหนดชำระทุก{freqTh}{' '}
            ระยะเวลากู้ <span className="font-bold underline">{term_length}</span> {termUnitTh}{' '}
            โดยเริ่มชำระงวดแรกในวันที่ <span className="font-bold underline">{firstDueDate}</span>
          </p>

          {/* ─── Clause 4: Collateral ─── */}
          {collateral && collateral !== 'ไม่มี' && (
            <p className="text-base indent-12 mb-4">
              <span className="font-bold">ข้อ 4. หลักประกัน</span>{' '}
              ผู้กู้ตกลงมอบหลักประกันเป็น{' '}
              <span className="font-bold underline">{collateral}</span>{' '}
              ไว้เป็นประกันการชำระหนี้ตามสัญญานี้ หากผู้กู้ผิดนัดชำระหนี้ ผู้ให้กู้มีสิทธิยึดหลักประกันดังกล่าวได้
            </p>
          )}

          {/* ─── Clause 5: Default ─── */}
          <p className="text-base indent-12 mb-4">
            <span className="font-bold">ข้อ {collateral && collateral !== 'ไม่มี' ? '5' : '4'}. กรณีผิดนัด</span>{' '}
            หากผู้กู้ผิดนัดชำระหนี้งวดใดงวดหนึ่ง ผู้ให้กู้มีสิทธิเรียกให้ผู้กู้ชำระหนี้ทั้งหมดที่ค้างชำระได้ทันที
            พร้อมดอกเบี้ยผิดนัดตามกฎหมาย
          </p>

          {/* ─── Clause 5: Closing ─── */}
          <p className="text-base indent-12 mb-8">
            <span className="font-bold">ข้อ {collateral && collateral !== 'ไม่มี' ? '6' : '5'}.</span>{' '}
            สัญญานี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาได้อ่านและเข้าใจข้อความในสัญญานี้โดยตลอดแล้ว
            จึงลงลายมือชื่อไว้เป็นหลักฐานต่อหน้าพยาน
          </p>

          {/* ─── Signature Section ─── */}
          <div className="border-t-2 border-gray-300 pt-10 mt-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <SignaturePad
                label="ผู้ให้กู้"
                nameEditable={false}
                nameValue={lender.name}
                sigRef={lenderSigRef}
                onClear={() => handleClear(lenderSigRef)}
              />
              <SignaturePad
                label="ผู้กู้"
                nameEditable={false}
                nameValue={borrower.name}
                sigRef={borrowerSigRef}
                onClear={() => handleClear(borrowerSigRef)}
              />
              <SignaturePad
                label="พยานคนที่ 1"
                nameEditable
                nameValue={witness1Name}
                onNameChange={(e) => setWitness1Name(e.target.value)}
                sigRef={witness1SigRef}
                onClear={() => handleClear(witness1SigRef)}
              />
              <SignaturePad
                label="พยานคนที่ 2"
                nameEditable
                nameValue={witness2Name}
                onNameChange={(e) => setWitness2Name(e.target.value)}
                sigRef={witness2SigRef}
                onClear={() => handleClear(witness2SigRef)}
              />
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <p className="text-center text-red-600 text-sm font-bold mt-6">{validationError}</p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-10 print:hidden">
            <Button variant="outline" onClick={onCancel} type="button" className="px-8">
              ← ย้อนกลับแก้ไข
            </Button>
            <Button onClick={handleConfirm} type="button" className="px-8 bg-green-600 hover:bg-green-700">
              ✓ ยืนยันสัญญาและลงนาม
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
