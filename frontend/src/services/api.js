const BASE_URL = 'http://localhost:8000/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Token ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const errorMsg = typeof data === 'string'
      ? data.slice(0, 200) || 'Something went wrong'
      : data.detail || data.error || Object.values(data).flat().join(', ') || 'Something went wrong';
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
  // Auth & Profile
  login: (username, password) => request('/users/auth/token/', {
    method: 'POST',
    body: { username, password }
  }),
  
  register: (userData) => request('/users/auth/register/', {
    method: 'POST',
    body: userData
  }),

  getProfile: () => request('/users/profile/'),
  updateProfile: (profileData) => request('/users/profile/', {
    method: 'PATCH',
    body: profileData
  }),

  // Slots
  getSlots: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/appointments/slots/${query ? `?${query}` : ''}`);
  },
  
  createSlot: (slotData) => request('/appointments/slots/', {
    method: 'POST',
    body: slotData
  }),

  // Appointments / Bookings
  getBookings: () => request('/appointments/bookings/'),
  
  createBooking: (bookingData) => request('/appointments/bookings/', {
    method: 'POST',
    body: bookingData
  }),

  getRoomToken: (appointmentId) => request(`/appointments/bookings/${appointmentId}/token/`),

  // Queue
  getQueue: () => request('/appointments/queue/'),
  createQueueEntry: (queueData) => request('/appointments/queue/', {
    method: 'POST',
    body: queueData
  }),
  updateQueueEntry: (id, queueData) => request(`/appointments/queue/${id}/`, {
    method: 'PATCH',
    body: queueData
  }),

  // Triage
  getTriage: () => request('/medical-records/triage/'),
  
  createTriage: (symptoms) => request('/medical-records/triage/', {
    method: 'POST',
    body: { symptoms }
  }),

  // Visual Acuity
  getAcuityTests: () => request('/medical-records/acuity-tests/'),
  
  createAcuityTest: (testData) => request('/medical-records/acuity-tests/', {
    method: 'POST',
    body: testData
  }),

  // Prescriptions
  getPrescriptions: () => request('/medical-records/prescriptions/'),
  
  createPrescription: (data) => request('/medical-records/prescriptions/', {
    method: 'POST',
    body: data
  }),
  
  signPrescription: (id) => request(`/medical-records/prescriptions/${id}/sign/`, {
    method: 'POST'
  }),

  // Medical Records
  getMedicalRecords: () => request('/medical-records/records/'),
  
  createMedicalRecord: (recordData) => request('/medical-records/records/', {
    method: 'POST',
    body: recordData
  }),

  // Diagnostic Device Data
  getDeviceData: () => request('/medical-records/device-data/'),
  
  uploadDeviceData: (fd) => {
    // Requires multipart/form-data so we bypass default json headers
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}/medical-records/device-data/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`
      },
      body: fd
    }).then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed uploading file');
      }
      return res.json();
    });
  },

  // Invoices
  getInvoices: () => request('/billing/invoices/'),
  
  createInvoice: (invoiceData) => request('/billing/invoices/', {
    method: 'POST',
    body: invoiceData
  }),

  payInvoice: (id, paymentMethodId = 'mock_card_token') => request(`/billing/invoices/${id}/pay/`, {
    method: 'POST',
    body: { payment_method_id: paymentMethodId }
  }),

  // Claims
  getClaims: () => request('/billing/claims/'),
  
  createClaim: (claimData) => request('/billing/claims/', {
    method: 'POST',
    body: claimData
  }),
  
  approveClaim: (id, approvalData) => request(`/billing/claims/${id}/process_approval/`, {
    method: 'POST',
    body: approvalData
  }),

  // Shop: Products
  getShopProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/shop/products/${query ? `?${query}` : ''}`);
  },

  // Shop: Inventory
  getShopInventory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/shop/inventory/${query ? `?${query}` : ''}`);
  },

  // Shop: Orders (replaces billing orders)
  getOrders: () => request('/shop/orders/'),
  
  createOrder: (orderData) => request('/shop/orders/', {
    method: 'POST',
    body: orderData
  }),
  
  updateOrder: (id, orderData) => request(`/shop/orders/${id}/`, {
    method: 'PATCH',
    body: orderData
  }),

  // Shop: Checkout (prescription-aware)
  checkoutShop: (items, deliveryAddress, isPickup = false, prescriptionId = null) =>
    request('/shop/orders/checkout/', {
      method: 'POST',
      body: { items, delivery_address: deliveryAddress, is_pickup: isPickup, prescription_id: prescriptionId }
    })
};
