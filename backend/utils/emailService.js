const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Nivestry <onboarding@resend.dev>';

const recentListEmailSent = new Map();

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const wrapEmailLayout = (title, intro, bodyHtml) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f7f5f0; padding: 24px; color: #1a1a18;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #dedad0; border-radius: 16px; overflow: hidden;">
      <div style="background: #1a1a18; color: #f7f5f0; padding: 20px 24px;">
        <p style="margin: 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #ebe8df;">Nivestry Home Services</p>
        <h1 style="margin: 6px 0 0; font-size: 20px; font-weight: 800;">${escapeHtml(title)}</h1>
      </div>
      <div style="padding: 24px;">
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4a4842;">${escapeHtml(intro)}</p>
        ${bodyHtml}
      </div>
      <div style="padding: 16px 24px; background: #f7f5f0; border-top: 1px solid #ebe8df; font-size: 12px; color: #6a675f;">
        This is an automated booking notification from Nivestry.
      </div>
    </div>
  </div>
`;

async function sendResendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  if (!apiKey || !to) {
    return { sent: false, reason: !apiKey ? 'RESEND_API_KEY missing' : 'Recipient email missing' };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('[Resend Email Warning]', response.status, data?.message || data?.error || JSON.stringify(data));
      return { sent: false, status: response.status, error: data };
    }
    console.log('[Resend Email Sent]', subject, '->', to, data?.id || '');
    return { sent: true, id: data?.id };
  } catch (err) {
    console.warn('[Resend Email Error]', err.message);
    return { sent: false, error: err.message };
  }
}

async function sendBookingConfirmationEmail({ to, customerName, booking }) {
  if (!to || !booking) return { sent: false };
  const bookingRef = booking.bookingId || booking.id || booking._id;
  const totalAmount = booking.finalTotal || booking.total || 0;
  const addressText = typeof booking.address === 'string'
    ? booking.address
    : (booking.address?.formattedAddress || booking.address?.street || 'Provided address');

  const bodyHtml = `
    <div style="background: #f7f5f0; border: 1px solid #e5e2db; border-radius: 12px; padding: 16px; font-size: 13px;">
      <p style="margin: 0 0 8px;"><strong>Booking ID:</strong> #${escapeHtml(bookingRef)}</p>
      <p style="margin: 0 0 8px;"><strong>Service:</strong> ${escapeHtml(booking.serviceName)}</p>
      <p style="margin: 0 0 8px;"><strong>Provider:</strong> ${escapeHtml(booking.providerName || 'Assigned Professional')}</p>
      <p style="margin: 0 0 8px;"><strong>Schedule:</strong> ${escapeHtml(booking.date)} at ${escapeHtml(booking.time)}</p>
      <p style="margin: 0 0 8px;"><strong>Location:</strong> ${escapeHtml(addressText)}</p>
      <p style="margin: 0 0 8px;"><strong>Status:</strong> ${escapeHtml(booking.status)}</p>
      <p style="margin: 0;"><strong>Total Amount:</strong> ${escapeHtml(formatCurrency(totalAmount))}</p>
    </div>
  `;

  return sendResendEmail({
    to,
    subject: `Booking Confirmed (#${bookingRef}) - ${booking.serviceName}`,
    html: wrapEmailLayout(
      `Booking Confirmed #${bookingRef}`,
      `Hi ${customerName || 'Customer'}, your booking for ${booking.serviceName} has been placed.`,
      bodyHtml
    ),
    text: `Hi ${customerName || 'Customer'}, your booking #${bookingRef} for ${booking.serviceName} on ${booking.date} at ${booking.time} (Total: ${formatCurrency(totalAmount)}) is ${booking.status}.`,
  });
}

async function sendBookingCompletedEmail({ to, customerName, booking }) {
  if (!to || !booking) return { sent: false };
  const bookingRef = booking.bookingId || booking.id || booking._id;
  const totalAmount = booking.finalTotal || booking.total || 0;

  const bodyHtml = `
    <div style="background: #f7f5f0; border: 1px solid #e5e2db; border-radius: 12px; padding: 16px; font-size: 13px;">
      <p style="margin: 0 0 8px;"><strong>Booking ID:</strong> #${escapeHtml(bookingRef)}</p>
      <p style="margin: 0 0 8px;"><strong>Service:</strong> ${escapeHtml(booking.serviceName)}</p>
      <p style="margin: 0 0 8px;"><strong>Provider:</strong> ${escapeHtml(booking.providerName || 'Assigned Professional')}</p>
      <p style="margin: 0 0 8px;"><strong>Schedule:</strong> ${escapeHtml(booking.date)} at ${escapeHtml(booking.time)}</p>
      <p style="margin: 0;"><strong>Final Amount:</strong> ${escapeHtml(formatCurrency(totalAmount))}</p>
    </div>
  `;

  return sendResendEmail({
    to,
    subject: `Service Completed (#${bookingRef}) - ${booking.serviceName}`,
    html: wrapEmailLayout(
      `Booking Completed #${bookingRef}`,
      `Hi ${customerName || 'Customer'}, your ${booking.serviceName} booking is now marked as completed.`,
      bodyHtml
    ),
    text: `Hi ${customerName || 'Customer'}, your booking #${bookingRef} for ${booking.serviceName} has been completed. Final amount: ${formatCurrency(totalAmount)}.`,
  });
}

async function sendCustomerBookingsListEmail({ to, customerName, bookings }) {
  if (!to || !Array.isArray(bookings) || bookings.length === 0) return { sent: false };

  // Deduplicate rapid double-fetches (e.g. React StrictMode) within 5 seconds per recipient
  const now = Date.now();
  const lastSent = recentListEmailSent.get(to) || 0;
  if (now - lastSent < 5000) {
    return { sent: false, reason: 'deduped_recent_list' };
  }
  recentListEmailSent.set(to, now);
  if (recentListEmailSent.size > 500) {
    recentListEmailSent.clear();
  }

  const rowsHtml = bookings.slice(0, 15).map((b) => `
    <tr>
      <td style="padding: 8px 10px; border-bottom: 1px solid #ebe8df;">#${escapeHtml(b.id || b.bookingId)}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #ebe8df;">${escapeHtml(b.serviceName)}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #ebe8df;">${escapeHtml(b.date)} ${escapeHtml(b.time)}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #ebe8df; text-transform: capitalize;">${escapeHtml(b.status)}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #ebe8df;">${escapeHtml(formatCurrency(b.finalTotal || b.total))}</td>
    </tr>
  `).join('');

  const bodyHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff; border: 1px solid #dedad0; border-radius: 10px;">
      <thead>
        <tr style="background: #f7f5f0; text-align: left;">
          <th style="padding: 8px 10px; border-bottom: 1px solid #dedad0;">ID</th>
          <th style="padding: 8px 10px; border-bottom: 1px solid #dedad0;">Service</th>
          <th style="padding: 8px 10px; border-bottom: 1px solid #dedad0;">Schedule</th>
          <th style="padding: 8px 10px; border-bottom: 1px solid #dedad0;">Status</th>
          <th style="padding: 8px 10px; border-bottom: 1px solid #dedad0;">Total</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  return sendResendEmail({
    to,
    subject: `Your Nivestry Bookings (${bookings.length})`,
    html: wrapEmailLayout(
      'Your Customer Bookings',
      `Hi ${customerName || 'Customer'}, here is your current list of ${bookings.length} booking${bookings.length === 1 ? '' : 's'}.`,
      bodyHtml
    ),
    text: `Hi ${customerName || 'Customer'}, you have ${bookings.length} booking(s) listed on Nivestry.`,
  });
}

module.exports = {
  sendResendEmail,
  sendBookingConfirmationEmail,
  sendBookingCompletedEmail,
  sendCustomerBookingsListEmail,
};
