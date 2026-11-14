// Pays one part of a visa application's fees: 'application_fee' (embassy + appointment fees,
// before submitting) or 'service_fee' (We Hive service fee + GST, after submitting).
// The amount is decided by the server; this only opens the checkout and confirms it.
import axios from 'axios';
import { API } from '../context/AuthContext';

function loadCheckout() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(window.Razorpay); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(window.Razorpay || null);
    s.onerror = () => resolve(null);
    document.body.appendChild(s);
  });
}

/** Resolves once the fee is paid; rejects with an Error (message is user-facing) otherwise. */
export async function payApplicationFee({ applicationId, token, user, part = 'application_fee' }) {
  const headers = { Authorization: `Bearer ${token}` };
  const { data: order } = await axios.post(`${API}/payments/application/${applicationId}/create-order`, { part }, { headers });
  const verify = (res) => axios.post(`${API}/payments/application/verify`, {
    razorpay_order_id: res.razorpay_order_id,
    razorpay_payment_id: res.razorpay_payment_id || '',
    razorpay_signature: res.razorpay_signature || '',
  }, { headers });

  // Development servers run without a gateway and confirm the order directly.
  if (order.razorpay_key === 'mock') {
    await verify({ razorpay_order_id: order.order_id });
    return order;
  }

  const Razorpay = await loadCheckout();
  if (!Razorpay) throw new Error('Could not open the payment window. Check your connection and try again.');
  await new Promise((resolve, reject) => {
    const rz = new Razorpay({
      key: order.razorpay_key,
      amount: order.amount,
      currency: order.currency,
      name: 'We Hive',
      description: `${part === 'service_fee' ? 'Service fee' : 'Visa application fee'} #${applicationId.slice(0, 8).toUpperCase()}`,
      order_id: order.order_id,
      handler: (res) => verify(res).then(resolve, () => reject(new Error('We could not confirm the payment. If money was deducted, contact support before paying again.'))),
      modal: { ondismiss: () => reject(new Error('Payment was cancelled. Nothing was charged.')) },
      prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
      theme: { color: '#011CB5' },
    });
    rz.on('payment.failed', () => reject(new Error('The payment did not go through. Nothing was charged.')));
    rz.open();
  });
  return order;
}
