import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CreditCard, Receipt, BarChart3, Check, DollarSign } from 'lucide-react';

export default function CashierDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('invoices');
  
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'invoices') {
        const invs = await api.getInvoices();
        setInvoices(invs.filter(inv => inv.status !== 'PAID'));
      } else if (activeTab === 'payments') {
        const pay = await api.getPayments();
        const rec = await api.getReceipts();
        setPayments(pay);
        setReceipts(rec);
      } else if (activeTab === 'reports') {
        const pay = await api.getPayments();
        setPayments(pay);
      }
    } catch (err) {
      alert('Error fetching data: ' + err.message);
    }
  };

  const handleProcessPayment = async (invoiceId, amount) => {
    const method = prompt('Enter payment method (CASH, CARD, MOBILE_MONEY, INSURANCE, BANK_TRANSFER):', 'CASH');
    if (!method) return;

    try {
      const paymentData = {
        invoice: invoiceId,
        amount: amount,
        payment_method: method.toUpperCase(),
        transaction_reference: `TRX-${Math.floor(Math.random() * 100000)}`
      };
      
      const newPayment = await api.createPayment(paymentData);
      
      // Update Invoice Status (simulated full payment for now)
      await api.updateInvoice(invoiceId, { status: 'PAID' });
      
      // Generate Receipt
      await api.createReceipt({
        payment: newPayment.id,
        receipt_number: `REC-${Date.now()}`,
        issued_by: user.id
      });
      
      alert('Payment processed successfully and receipt generated!');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Compute stats for reports
  const today = new Date().toISOString().split('T')[0];
  const dailyRevenue = payments
    .filter(p => p.created_at.startsWith(today) && !p.is_refund)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalRevenue = payments
    .filter(p => !p.is_refund)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return (
    <div className="glass-container" style={{ padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Cashier Dashboard</h2>
        </div>
        <button className="glass-btn glass-btn-secondary" onClick={onLogout}>Logout</button>
      </header>

      {/* Tabs */}
      <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px', marginBottom: '24px' }}>
        <button className={`glass-btn ${activeTab === 'invoices' ? '' : 'glass-btn-secondary'}`} onClick={() => setActiveTab('invoices')} title="Pending Invoices">
          <CreditCard size={18} /> <span className="cashier-tab-label">Pending Invoices</span>
        </button>
        <button className={`glass-btn ${activeTab === 'payments' ? '' : 'glass-btn-secondary'}`} onClick={() => setActiveTab('payments')} title="Payments &amp; Receipts">
          <Receipt size={18} /> <span className="cashier-tab-label">Payments &amp; Receipts</span>
        </button>
        <button className={`glass-btn ${activeTab === 'reports' ? '' : 'glass-btn-secondary'}`} onClick={() => setActiveTab('reports')} title="Financial Reports">
          <BarChart3 size={18} /> <span className="cashier-tab-label">Financial Reports</span>
        </button>
      </div>

      <div className="tab-content">
        
        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3>Pending Invoices</h3>
            <p style={{ marginBottom: '16px' }}>Process payments for unpaid patient invoices.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {invoices.length === 0 ? <p>No pending invoices.</p> : (
                invoices.map(inv => (
                  <div key={inv.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4>Invoice #{inv.id}</h4>
                      <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Patient: {inv.patient_details?.username} | Amount: ${inv.amount}
                      </div>
                      <div style={{ fontSize: '0.85em', marginTop: '4px' }}>
                        Status: <span style={{ color: '#f59e0b' }}>{inv.status}</span>
                      </div>
                    </div>
                    <button className="glass-btn" onClick={() => handleProcessPayment(inv.id, inv.amount)}>
                      <DollarSign size={14} /> Process Payment
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Payments & Receipts Tab */}
        {activeTab === 'payments' && (
          <div className="grid-container">
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>Recent Payments</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {payments.length === 0 ? <p>No payments recorded.</p> : (
                  payments.map(pay => (
                    <div key={pay.id} style={{ padding: '12px', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>Payment #{pay.id}</strong>
                        <span>${pay.amount}</span>
                      </div>
                      <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Method: {pay.payment_method} | Invoice: #{pay.invoice}
                        <br/>Date: {new Date(pay.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>Generated Receipts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {receipts.length === 0 ? <p>No receipts generated.</p> : (
                  receipts.map(rec => (
                    <div key={rec.id} style={{ padding: '12px', border: '1px solid var(--glass-border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{rec.receipt_number}</strong>
                        <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                          For Payment #{rec.payment}
                        </div>
                      </div>
                      <button className="glass-btn glass-btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => alert(`Printing Receipt: ${rec.receipt_number}`)}>
                        Print
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Financial Reports Tab */}
        {activeTab === 'reports' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3>Financial Reports</h3>
            <p style={{ marginBottom: '24px' }}>Live metrics based on processed payments.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ padding: '24px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Today's Revenue</h4>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  ${dailyRevenue.toFixed(2)}
                </div>
              </div>

              <div style={{ padding: '24px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Total Revenue</h4>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  ${totalRevenue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
