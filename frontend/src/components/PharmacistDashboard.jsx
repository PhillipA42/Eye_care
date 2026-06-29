import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Package, Truck, ArrowRight } from 'lucide-react';

export default function PharmacistDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Inventory state
  const [inventory, setInventory] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemType, setNewItemType] = useState('MEDICATION');
  const [newItemStock, setNewItemStock] = useState(0);
  const [newItemPrice, setNewItemPrice] = useState(0.00);

  // Orders state
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'inventory') {
        const res = await api.getInventory();
        setInventory(res);
      } else if (activeTab === 'orders') {
        const res = await api.getOrders();
        setOrders(res);
      }
    } catch (err) {
      alert('Error fetching data: ' + err.message);
    }
  };

  // Add Inventory Item
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemSku) {
      alert('Name and SKU are required.');
      return;
    }
    try {
      await api.createInventoryItem({
        name: newItemName,
        sku: newItemSku,
        item_type: newItemType,
        stock_level: parseInt(newItemStock),
        unit_price: parseFloat(newItemPrice),
        description: 'New inventory item added via dashboard.'
      });
      alert('Item added successfully!');
      setNewItemName('');
      setNewItemSku('');
      setNewItemStock(0);
      setNewItemPrice(0.00);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Update Inventory Stock
  const handleUpdateStock = async (id, currentStock) => {
    const newStock = prompt('Update stock quantity to:', currentStock);
    if (newStock === null) return;
    const stockVal = parseInt(newStock);
    if (isNaN(stockVal)) return;

    try {
      const item = inventory.find(i => i.id === id);
      await api.updateInventoryItem(id, {
        ...item,
        stock_level: stockVal
      });
      alert('Stock level updated.');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Update Order Status
  const handleOrderStatusUpdate = async (id, status) => {
    try {
      await api.updateOrder(id, { status });
      alert(`Order updated to ${status}.`);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="glass-container" style={{ padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Fulfillment Workspace ({user.role})</h2>
        </div>
        <button className="glass-btn glass-btn-secondary" onClick={onLogout}>Logout</button>
      </header>

      {/* Tabs */}
      <div className="glass-card" style={{ display: 'flex', gap: '8px', padding: '8px', marginBottom: '24px' }}>
        <button className={`glass-btn ${activeTab === 'inventory' ? '' : 'glass-btn-secondary'}`} onClick={() => setActiveTab('inventory')}>
          <Package size={18} /> Product Inventory
        </button>
        <button className={`glass-btn ${activeTab === 'orders' ? '' : 'glass-btn-secondary'}`} onClick={() => setActiveTab('orders')}>
          <Truck size={18} /> Manage Patient Orders
        </button>
      </div>

      <div className="tab-content">
        
        {/* Product Inventory */}
        {activeTab === 'inventory' && (
          <div className="grid-container">
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>Add Inventory Item</h3>
              <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                <input type="text" placeholder="Item Name" className="glass-input" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
                <input type="text" placeholder="SKU Code" className="glass-input" value={newItemSku} onChange={e => setNewItemSku(e.target.value)} required />
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85em' }}>Item Type</label>
                    <select className="glass-input" style={{ width: '100%', marginTop: '4px' }} value={newItemType} onChange={e => setNewItemType(e.target.value)}>
                      <option value="MEDICATION">Medication (Drops/Pills)</option>
                      <option value="LENS">Contact Lens</option>
                      <option value="FRAME">Glasses Frame</option>
                    </select>
                  </div>
                  <div style={{ width: '90px' }}>
                    <label style={{ fontSize: '0.85em' }}>Stock</label>
                    <input type="number" className="glass-input" style={{ width: '100%', marginTop: '4px' }} value={newItemStock} onChange={e => setNewItemStock(e.target.value)} required />
                  </div>
                  <div style={{ width: '110px' }}>
                    <label style={{ fontSize: '0.85em' }}>Unit Price</label>
                    <input type="number" step="0.01" className="glass-input" style={{ width: '100%', marginTop: '4px' }} value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} required />
                  </div>
                </div>

                <button type="submit" className="glass-btn">Add to Stock</button>
              </form>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>Current Inventory</h3>
              <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {inventory.length === 0 ? <p>No items registered.</p> : (
                  inventory.map(item => (
                    <div key={item.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '12px', background: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{item.name}</strong> <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>({item.sku})</span>
                        <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Price: ${item.unit_price} | Stock: <strong style={{ color: item.stock_level < 5 ? 'var(--danger)' : 'inherit' }}>{item.stock_level}</strong>
                        </div>
                      </div>
                      <button className="glass-btn" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleUpdateStock(item.id, item.stock_level)}>Update Stock</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manage Patient Orders */}
        {activeTab === 'orders' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3>Incoming Prescription Orders</h3>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.length === 0 ? <p>No orders currently placed.</p> : (
                orders.map(order => (
                  <div key={order.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h4>Order #{order.id} - {order.order_type}</h4>
                      <p style={{ fontSize: '0.9em', marginTop: '6px' }}><strong>Patient:</strong> {order.patient_details?.username} ({order.patient_details?.email})</p>
                      <p style={{ fontSize: '0.9em', marginTop: '4px' }}><strong>Delivery Address:</strong> {order.delivery_address || 'Clinic Pickup'}</p>
                      
                      {order.items && order.items.length > 0 && (
                        <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Items ordered:</span>
                          <ul style={{ paddingLeft: '18px', fontSize: '0.9em', marginTop: '4px' }}>
                            {order.items.map((it, idx) => (
                              <li key={idx}>{it.inventory_item_details?.name} (Qty: {it.quantity}) - Price: ${it.price}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div style={{ marginBottom: '8px', fontSize: '0.9em' }}>
                        Current Status: <strong style={{ color: 'var(--secondary)' }}>{order.status}</strong>
                      </div>
                      
                      {order.status === 'PENDING' && (
                        <button className="glass-btn" style={{ fontSize: '0.85rem', padding: '6px 12px' }} onClick={() => handleOrderStatusUpdate(order.id, 'PROCESSING')}>
                          Mark Processing <ArrowRight size={14} />
                        </button>
                      )}
                      {order.status === 'PROCESSING' && (
                        <button className="glass-btn" style={{ fontSize: '0.85rem', padding: '6px 12px', background: 'var(--secondary)' }} onClick={() => handleOrderStatusUpdate(order.id, 'SHIPPED')}>
                          Mark Shipped <ArrowRight size={14} />
                        </button>
                      )}
                      {order.status === 'SHIPPED' && (
                        <button className="glass-btn" style={{ fontSize: '0.85rem', padding: '6px 12px', background: 'var(--accent)' }} onClick={() => handleOrderStatusUpdate(order.id, 'DELIVERED')}>
                          Mark Delivered <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
