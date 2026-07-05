import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, Eye } from 'lucide-react';
import { api } from '../services/api';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function Shop({ user, inline = false, initialTab = 'browse' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    fetchShopData();
    fetchPrescriptions();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchShopData = async () => {
    try {
      const [prods, inv, ords] = await Promise.all([
        api.getShopProducts().catch(() => []),
        api.getShopInventory().catch(() => []),
        api.getOrders().catch(() => [])
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      setInventory(Array.isArray(inv) ? inv : []);
      setOrders(Array.isArray(ords) ? ords : []);
    } catch (err) {
      console.error('Error fetching shop data:', err);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const presc = await api.getPrescriptions();
      setPrescriptions(Array.isArray(presc) ? presc : []);
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product_id: product.id, product_name: product.name, product_type: product.item_type, unit_price: product.unit_price, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(item => item.product_id === productId ? { ...item, quantity } : item));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Your cart is empty.');
      return;
    }
    if (!deliveryAddress) {
      alert('Please provide a delivery address.');
      return;
    }
    
    // Check if any product requires prescription
    const requiresPrescription = cart.some(item => {
      const product = products.find(p => p.id === item.product_id);
      return product && product.is_prescription_required;
    });

    if (requiresPrescription && !selectedPrescription) {
      alert('Some products require a prescription. Please select one.');
      return;
    }

    setIsLoading(true);
    try {
      const items = cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }));
      await api.checkoutShop(items, deliveryAddress, false, selectedPrescription);
      setCheckoutSuccess(true);
      setCart([]);
      setDeliveryAddress('');
      setSelectedPrescription(null);
      setTimeout(() => setCheckoutSuccess(false), 3000);
      fetchShopData();
    } catch (err) {
      alert('Checkout failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: 'rgba(15, 23, 42, 0.06)', borderRadius: '18px' }}>
      <h3 style={{ marginTop: 0 }}>Shop</h3>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          className={`glass-btn ${activeTab === 'browse' ? '' : 'glass-btn-secondary'}`}
          onClick={() => setActiveTab('browse')}
        >
          <Eye size={16} /> Browse Products
        </button>
        <button
          className={`glass-btn ${activeTab === 'cart' ? '' : 'glass-btn-secondary'}`}
          onClick={() => setActiveTab('cart')}
        >
          <ShoppingCart size={16} /> Cart ({cart.length})
        </button>
        <button
          className={`glass-btn ${activeTab === 'orders' ? '' : 'glass-btn-secondary'}`}
          onClick={() => setActiveTab('orders')}
        >
          Order History
        </button>
      </div>

      {checkoutSuccess && (
        <div style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#22c55e' }}>
          ✓ Order placed successfully!
        </div>
      )}

      {/* Browse Products */}
      {activeTab === 'browse' && (
        <div>
          <h4>Available Products</h4>
          {products.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No products available at the moment.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {products.map(product => (
                <div key={product.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                  <h5 style={{ marginTop: 0 }}>{product.name}</h5>
                  <p style={{ color: 'var(--text-muted)', margin: '8px 0' }}>{product.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{formatCurrency(product.unit_price)}</span>
                    <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>{product.item_type}</span>
                  </div>
                  {product.is_prescription_required && (
                    <p style={{ fontSize: '0.85em', color: '#f59e0b', marginBottom: '12px' }}>⚠ Requires prescription</p>
                  )}
                  <button
                    className="glass-btn"
                    style={{ width: '100%' }}
                    onClick={() => addToCart(product)}
                  >
                    <Plus size={16} /> Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cart */}
      {activeTab === 'cart' && (
        <div>
          <h4>Shopping Cart</h4>
          {cart.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Your cart is empty.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {cart.map(item => (
                  <div key={item.product_id} style={{ border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <strong>{item.product_name}</strong>
                      <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontSize: '0.9em' }}>{formatCurrency(item.unit_price)} each</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button className="glass-btn glass-btn-secondary" style={{ padding: '4px 8px' }} onClick={() => updateQuantity(item.product_id, item.quantity - 1)}><Minus size={14} /></button>
                      <span style={{ minWidth: '30px', textAlign: 'center' }}>{item.quantity}</span>
                      <button className="glass-btn glass-btn-secondary" style={{ padding: '4px 8px' }} onClick={() => updateQuantity(item.product_id, item.quantity + 1)}><Plus size={14} /></button>
                      <button className="glass-btn glass-btn-secondary" style={{ padding: '4px 8px' }} onClick={() => removeFromCart(item.product_id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9em' }}>Delivery Address *</label>
                  <textarea
                    className="glass-input"
                    placeholder="Enter your delivery address"
                    style={{ minHeight: '80px', width: '100%' }}
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    required
                  />
                </div>

                {/* Prescription selection for prescription-required items */}
                {cart.some(item => {
                  const prod = products.find(p => p.id === item.product_id);
                  return prod && prod.is_prescription_required;
                }) && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9em' }}>
                      Select Prescription *
                    </label>
                    <select
                      className="glass-input"
                      style={{ width: '100%' }}
                      value={selectedPrescription || ''}
                      onChange={e => setSelectedPrescription(e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">-- Choose a prescription --</option>
                      {prescriptions.map(presc => (
                        <option key={presc.id} value={presc.id}>
                          Prescription #{presc.id} ({new Date(presc.created_at).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                  <strong>Total:</strong>
                  <span style={{ fontSize: '1.3em' }}>{formatCurrency(calculateTotal())}</span>
                </div>

                <button
                  type="submit"
                  className="glass-btn"
                  disabled={isLoading}
                  style={{ opacity: isLoading ? 0.6 : 1 }}
                >
                  {isLoading ? 'Processing...' : 'Complete Purchase'}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Order History */}
      {activeTab === 'orders' && (
        <div>
          <h4>My Orders</h4>
          {orders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No orders yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.map(order => (
                <div key={order.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '14px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>Order #{order.id}</strong>
                    <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: order.status === 'COMPLETED' ? '#22c55e' : order.status === 'PROCESSING' ? '#f59e0b' : '#0ea5e9' }}>
                      {order.status}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontSize: '0.85em' }}>
                    Ordered: {new Date(order.created_at).toLocaleDateString()}
                  </p>
                  <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontSize: '0.85em' }}>
                    Total: <strong>{formatCurrency(order.total_amount)}</strong>
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.85em' }}>
                    {order.is_pickup ? 'Pickup' : `Delivery: ${order.delivery_address}`}
                  </p>
                  {order.items && order.items.length > 0 && (
                    <ul style={{ margin: '8px 0', paddingLeft: '18px', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                      {order.items.map((item, idx) => (
                        <li key={idx}>{item.product?.name} x {item.quantity}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
