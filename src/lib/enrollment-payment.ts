export function paymentVerificationUpdate(paymentStatus: "verified" | "failed") {
  // Keep the existing enrollment status: the connected backend owns its CHECK constraint.
  return { payment_status: paymentStatus };
}

export const approvedEnrollmentFilter = "payment_status.eq.verified,and(status.eq.active,payment_status.is.null)";