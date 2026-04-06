// ============================================================================
// Loan Calculation Engine
// ============================================================================
// This module provides the core financial calculations for the loan
// management system. It uses a FLAT interest model, meaning interest is
// computed once on the original principal for the entire loan term, then
// the total (principal + interest) is divided evenly across installments.
// ============================================================================

/**
 * Convert a human-friendly interest rate to a daily rate.
 *
 * The raw rate is first divided by 100 to move from percentage to decimal.
 * Then it is scaled to a per-day figure depending on the unit the user
 * originally expressed the rate in:
 *
 *   daily  -> rate / 100                (already per day)
 *   monthly -> rate / 100 / 30          (assume 30-day month)
 *   yearly  -> rate / 100 / 365         (assume 365-day year)
 *
 * @param {number} rate  - The interest rate as a percentage (e.g. 5 means 5%)
 * @param {string} unit  - One of "daily", "monthly", "yearly"
 * @returns {number}       The equivalent daily interest rate as a decimal
 */
export function convertToDailyRate(rate, unit) {
  switch (unit) {
    case "daily":
      // Already expressed per day; just convert from percent to decimal.
      return rate / 100;

    case "monthly":
      // Convert percent to decimal, then spread over 30 days.
      return rate / 100 / 30;

    case "yearly":
      // Convert percent to decimal, then spread over 365 days.
      return rate / 100 / 365;

    default:
      throw new Error(`Unknown interest rate unit: "${unit}"`);
  }
}

/**
 * Calculate the total duration of a loan in days.
 *
 * Supported term units:
 *   days   -> the term length IS the number of days
 *   months -> each month is treated as exactly 30 days
 *
 * @param {number} termLength - The numeric length of the loan term
 * @param {string} termUnit   - One of "days", "months"
 * @returns {number}            Total loan duration in days
 */
export function calculateTotalDays(termLength, termUnit) {
  switch (termUnit) {
    case "days":
      return termLength;

    case "months":
      // Use a fixed 30-day month for simplicity and predictability.
      return termLength * 30;

    default:
      throw new Error(`Unknown term unit: "${termUnit}"`);
  }
}

/**
 * Determine how many installments the borrower must make.
 *
 * We divide the total loan duration (in days) by the number of days in
 * each payment period and round UP so the entire term is covered:
 *
 *   daily   -> one payment per day
 *   weekly  -> one payment every 7 days   (ceil to cover partial weeks)
 *   monthly -> one payment every 30 days  (ceil to cover partial months)
 *
 * @param {number} totalDays         - Total loan duration in days
 * @param {string} paymentFrequency  - One of "daily", "weekly", "monthly"
 * @returns {number}                   Number of installments
 */
export function calculateInstallmentCount(totalDays, paymentFrequency) {
  switch (paymentFrequency) {
    case "daily":
      return totalDays;

    case "weekly":
      // Round up so the last partial week still gets an installment.
      return Math.ceil(totalDays / 7);

    case "monthly":
      // Round up so the last partial month still gets an installment.
      return Math.ceil(totalDays / 30);

    default:
      throw new Error(`Unknown payment frequency: "${paymentFrequency}"`);
  }
}

/**
 * Main loan calculation — computes all derived financial figures.
 *
 * Uses the FLAT interest formula:
 *   total_interest = principal × daily_rate × total_days
 *
 * This means interest is calculated once, up front, on the full principal
 * for the entire loan duration. It does NOT compound.
 *
 *   total_payable     = principal + total_interest
 *   installment_amount = total_payable / installment_count
 *
 * @param {Object} params
 * @param {number} params.principal           - Loan amount disbursed
 * @param {number} params.interest_rate       - Interest rate (percentage)
 * @param {string} params.interest_rate_unit  - "daily" | "monthly" | "yearly"
 * @param {number} params.term_length         - Numeric term length
 * @param {string} params.term_unit           - "days" | "months"
 * @param {string} params.payment_frequency   - "daily" | "weekly" | "monthly"
 * @param {string} params.interest_behavior   - "simple" | "capitalize"
 *
 * @returns {Object} Calculated loan summary
 * @returns {number} .daily_rate          - Daily interest rate (decimal)
 * @returns {number} .total_days          - Loan duration in days
 * @returns {number} .total_interest      - Total flat interest over term
 * @returns {number} .total_payable       - Principal + total interest
 * @returns {number} .installment_count   - Number of scheduled payments
 * @returns {number} .installment_amount  - Amount due per installment
 */
export function calculateLoan(params) {
  const {
    principal,
    interest_rate,
    interest_rate_unit,
    term_length,
    term_unit,
    payment_frequency,
    interest_behavior,
  } = params;

  // Step 1: Normalise the interest rate to a per-day decimal.
  const daily_rate = convertToDailyRate(interest_rate, interest_rate_unit);

  // Step 2: Express the full loan term in days.
  const total_days = calculateTotalDays(term_length, term_unit);

  // Step 3: Flat interest — principal × daily rate × number of days.
  // Example: 10,000 × 0.001 × 90 = 900
  const total_interest = principal * daily_rate * total_days;

  // Step 4: The borrower owes back the original principal PLUS the interest.
  const total_payable = principal + total_interest;

  // Step 5: How many payments will they make?
  const installment_count = calculateInstallmentCount(total_days, payment_frequency);

  // Step 6: Divide the total evenly across installments.
  // Rounding to 2 decimal places for currency precision.
  const installment_amount = Math.round((total_payable / installment_count) * 100) / 100;

  return {
    daily_rate,
    total_days,
    total_interest,
    total_payable,
    installment_count,
    installment_amount,
  };
}

// ---------------------------------------------------------------------------
// Helper: advance a Date by a given payment frequency
// ---------------------------------------------------------------------------
function addFrequencyToDate(date, frequency) {
  const d = new Date(date);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    default:
      throw new Error(`Unknown payment frequency: "${frequency}"`);
  }
  return d;
}

/**
 * Generate the full amortisation (payment) schedule for a loan.
 *
 * Principal and interest are each distributed evenly across installments.
 * The LAST installment absorbs any rounding remainder so the schedule
 * totals match the loan figures exactly.
 *
 * Due dates are spaced according to the payment frequency, starting from
 * the disbursement date.
 *
 * @param {Object} loan  - A loan object containing at least:
 *   {number} principal, {number} total_interest, {number} total_payable,
 *   {number} installment_count, {string} payment_frequency,
 *   {string|Date} disbursed_at
 *
 * @returns {Array<Object>} Array of installment objects:
 *   { installment, due_date, principal_due, interest_due, total_due }
 */
export function generateSchedule(loan) {
  const {
    principal,
    total_interest,
    total_payable,
    installment_count,
    payment_frequency,
    disbursed_at,
  } = loan;

  const schedule = [];

  // ----- Even distribution per installment (rounded to 2 dp) -----
  const basePrincipal = Math.round((principal / installment_count) * 100) / 100;
  const baseInterest = Math.round((total_interest / installment_count) * 100) / 100;

  // Track running totals so we can fix rounding on the last installment.
  let principalAccumulated = 0;
  let interestAccumulated = 0;

  // The first due date is one frequency-period after disbursement.
  let dueDate = new Date(disbursed_at);

  for (let i = 1; i <= installment_count; i++) {
    // Advance the due date by the payment frequency.
    dueDate = addFrequencyToDate(dueDate, payment_frequency);

    let principalDue;
    let interestDue;

    if (i < installment_count) {
      // Regular installment — use the evenly divided amounts.
      principalDue = basePrincipal;
      interestDue = baseInterest;

      principalAccumulated += principalDue;
      interestAccumulated += interestDue;
    } else {
      // LAST installment — absorb any leftover cents from rounding.
      // This guarantees the schedule sums to the exact totals.
      principalDue = Math.round((principal - principalAccumulated) * 100) / 100;
      interestDue = Math.round((total_interest - interestAccumulated) * 100) / 100;
    }

    const totalDue = Math.round((principalDue + interestDue) * 100) / 100;

    schedule.push({
      installment: i,
      due_date: new Date(dueDate),
      principal_due: principalDue,
      interest_due: interestDue,
      total_due: totalDue,
    });
  }

  return schedule;
}

/**
 * Allocate a payment against an installment following the rule:
 *   INTEREST FIRST, then PRINCIPAL.
 *
 * This is a common microfinance / flat-interest convention: any incoming
 * payment covers accrued interest before reducing the outstanding balance.
 *
 * If the payment is not enough to cover the full interest due:
 *   - "capitalize" behaviour: the unpaid interest is added back to the
 *     principal (capitalize_amount), increasing the outstanding balance.
 *   - "simple" behaviour: the shortfall is simply noted; it does NOT
 *     get added to the principal.
 *
 * @param {number} amount              - The payment amount received
 * @param {Object} schedule            - The current installment object
 *   { interest_due: number, total_due: number }
 * @param {string} interestBehavior    - "simple" | "capitalize"
 * @param {number} outstandingBalance  - Current outstanding principal
 *
 * @returns {Object}
 *   { interest_paid, principal_paid, new_outstanding, capitalize_amount }
 */
export function applyPayment(amount, schedule, interestBehavior, outstandingBalance) {
  let remaining = amount;

  // ---- Step 1: Pay interest first ----
  const interestDue = schedule.interest_due;
  const interestPaid = Math.min(remaining, interestDue);
  remaining -= interestPaid;

  // ---- Step 2: Whatever is left goes toward principal ----
  const principalDue = schedule.total_due - schedule.interest_due;
  const principalPaid = Math.min(remaining, principalDue);
  remaining -= principalPaid;

  // ---- Step 3: Update the outstanding balance ----
  let newOutstanding = outstandingBalance - principalPaid;

  // ---- Step 4: Handle unpaid interest ----
  const unpaidInterest = interestDue - interestPaid;
  let capitalizeAmount = 0;

  if (unpaidInterest > 0 && interestBehavior === "capitalize") {
    // Capitalize: roll the unpaid interest into the principal.
    // This increases the balance the borrower owes going forward.
    capitalizeAmount = Math.round(unpaidInterest * 100) / 100;
    newOutstanding += capitalizeAmount;
  }
  // If behaviour is "simple", unpaid interest is NOT added to principal.

  return {
    interest_paid: Math.round(interestPaid * 100) / 100,
    principal_paid: Math.round(principalPaid * 100) / 100,
    new_outstanding: Math.round(newOutstanding * 100) / 100,
    capitalize_amount: capitalizeAmount,
  };
}
