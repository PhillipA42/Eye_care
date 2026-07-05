import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Glasses,
  Loader2,
  LogOut,
  Menu,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
import { api } from '../services/api';

const OPTICAL_ITEM_TYPES = new Set(['FRAME', 'LENS', 'ACCESSORY']);
const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

function getPatientName(patient) {
  if (!patient) return 'Patient';
  const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(' ').trim();
  return fullName || patient.username || `Patient #${patient.id}`;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export default function OpticianDashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [message, setMessage] = useState('');

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 900) {
        setSidebarCollapsed(true);
      } else {
        setMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (key) => {
    setActiveView(key);
    if (window.innerWidth <= 900) setMobileOpen(false);
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [inventoryData, orderData] = await Promise.all([
        api.getShopInventory(),
        api.getOrders(),
      ]);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
    } catch (error) {
      setMessage(error.message || 'Unable to load optician dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  const opticalInventory = useMemo(() => (
    inventory.filter((item) => OPTICAL_ITEM_TYPES.has(item.product?.item_type))
  ), [inventory]);

  const opticalOrders = useMemo(() => (
    orders.filter((order) => order.items?.some((item) => OPTICAL_ITEM_TYPES.has(item.product?.item_type)))
  ), [orders]);

  const filteredInventory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return opticalInventory;
    return opticalInventory.filter((item) => {
      const product = item.product || {};
      return [
        product.name,
        product.sku,
        product.description,
        product.manufacturer,
        item.location,
        item.batch_number,
        item.supplier,
      ].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [opticalInventory, searchTerm]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return opticalOrders;
    return opticalOrders.filter((order) => {
      const orderItems = order.items?.map((item) => item.product?.name).filter(Boolean).join(' ') || '';
      return [
        order.id,
        order.status,
        getPatientName(order.patient_details),
        order.delivery_address,
        orderItems,
      ].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [opticalOrders, searchTerm]);

  const lowStockItems = useMemo(() => (
    opticalInventory.filter((item) => Number(item.stock_level) <= Number(item.reorder_level || 0))
  ), [opticalInventory]);

  const pendingOrders = useMemo(() => (
    opticalOrders.filter((order) => ['PENDING', 'PROCESSING'].includes(order.status))
  ), [opticalOrders]);

  const inventoryValue = useMemo(() => (
    opticalInventory.reduce((total, item) => {
      const price = Number(item.price || item.product?.unit_price || 0);
      return total + price * Number(item.stock_level || 0);
    }, 0)
  ), [opticalInventory]);

  const handleOrderStatusChange = async (orderId, status) => {
    setUpdatingOrderId(orderId);
    setMessage('');
    try {
      const updatedOrder = await api.updateOrder(orderId, { status });
      setOrders((currentOrders) => (
        currentOrders.map((order) => (order.id === orderId ? updatedOrder : order))
      ));
      setMessage(`Order #${orderId} updated to ${status.toLowerCase()}.`);
    } catch (error) {
      setMessage(error.message || 'Order update failed.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const navigationItems = [
    { key: 'overview', label: 'Overview', icon: ClipboardList },
    { key: 'orders', label: 'Eyewear Orders', icon: ShoppingBag },
    { key: 'inventory', label: 'Optical Stock', icon: Boxes },
    { key: 'alerts', label: 'Stock Alerts', icon: AlertTriangle },
  ];

  return (
    <div className={`doctor-dashboard ${darkMode ? 'dark' : ''}`}>
      {/* Backdrop for mobile sidebar */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div>
          <div className="sidebar-brand">
            <div className="brand-mark"><Glasses size={20} /></div>
            <div className="brand-copy">
              <strong>EyeCare</strong>
              <span>Optician Workspace</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`sidebar-item ${activeView === item.key ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.key)}
                  title={item.label}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-toggle" type="button" onClick={() => setSidebarCollapsed((value) => !value)}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button className="mode-toggle" type="button" onClick={() => setDarkMode((value) => !value)}>
            <ShieldCheck size={16} />
            <span>{darkMode ? 'Light' : 'Dark'}</span>
          </button>
          <button className="dashboard-logout-btn" type="button" onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          {/* Hamburger — visible only on mobile */}
          <button
            className="sidebar-mobile-btn"
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="search-field">
            <Search size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search orders, patients, products, SKU, location..."
              aria-label="Search optician dashboard"
            />
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Low stock alerts" onClick={() => setActiveView('alerts')}>
              <Bell size={20} />
              {lowStockItems.length > 0 && <span className="icon-badge">{lowStockItems.length}</span>}
            </button>
            <button className="icon-button" type="button" aria-label="Refresh dashboard" onClick={fetchDashboardData}>
              <RefreshCw size={20} />
            </button>
            <button className="profile-pill" type="button">
              <div className="profile-avatar">{(user?.first_name || user?.username || 'O')[0]}</div>
              <div>
                <strong>{user?.first_name || user?.username || 'Optician'} {user?.last_name || ''}</strong>
                <small>{user?.role || 'OPTICIAN'}</small>
              </div>
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          {message && <div className="result-banner status-info">{message}</div>}

          {loading ? (
            <section className="card section-card optician-loading">
              <Loader2 className="optician-spinner" size={24} />
              Loading optician records...
            </section>
          ) : (
            <>
              {activeView === 'overview' && (
                <>
                  <section className="overview-grid">
                    <MetricCard icon={ShoppingBag} label="Active eyewear orders" value={pendingOrders.length} detail="Pending and processing" accent="blue" />
                    <MetricCard icon={Glasses} label="Optical stock records" value={opticalInventory.length} detail="Frames, lenses, accessories" accent="purple" />
                    <MetricCard icon={AlertTriangle} label="Low stock alerts" value={lowStockItems.length} detail="Below reorder level" accent="teal" />
                    <MetricCard icon={PackageCheck} label="Inventory value" value={formatCurrency(inventoryValue)} detail="Current stock value" accent="green" />
                  </section>

                  <div className="dashboard-grid two-col">
                    <OrdersPanel orders={filteredOrders.slice(0, 6)} onStatusChange={handleOrderStatusChange} updatingOrderId={updatingOrderId} />
                    <InventoryPanel inventory={filteredInventory.slice(0, 8)} />
                  </div>
                </>
              )}

              {activeView === 'orders' && (
                <OrdersPanel orders={filteredOrders} onStatusChange={handleOrderStatusChange} updatingOrderId={updatingOrderId} expanded />
              )}

              {activeView === 'inventory' && (
                <InventoryPanel inventory={filteredInventory} expanded />
              )}

              {activeView === 'alerts' && (
                <InventoryPanel inventory={lowStockItems} title="Low Stock Optical Items" expanded />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-${accent}`}><Icon size={22} /></div>
      <div>
        <p className="stat-label">{label}</p>
        <h3>{value}</h3>
        <p className="stat-detail">{detail}</p>
      </div>
    </article>
  );
}

function OrdersPanel({ orders, onStatusChange, updatingOrderId, expanded = false }) {
  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>Eyewear Orders</h3>
        <p>Orders containing frames, lenses, or optical accessories.</p>
      </div>

      <div className={`dashboard-list ${expanded ? 'optician-expanded-list' : ''}`}>
        {orders.length === 0 ? (
          <p className="empty-state">No optical orders match the current view.</p>
        ) : (
          orders.map((order) => {
            const opticalItems = order.items?.filter((item) => OPTICAL_ITEM_TYPES.has(item.product?.item_type)) || [];
            return (
              <article key={order.id} className="dashboard-list-item optician-order-item">
                <div className="list-top">
                  <div>
                    <strong>Order #{order.id}</strong>
                    <p>{getPatientName(order.patient_details)}</p>
                  </div>
                  <span className={`status-pill ${getStatusClass(order.status)}`}>{order.status}</span>
                </div>

                <div className="optician-item-stack">
                  {opticalItems.map((item) => (
                    <div key={item.id} className="optician-product-line">
                      <span>{item.product?.name || 'Optical item'}</span>
                      <small>Qty {item.quantity} · {formatCurrency(item.unit_price)}</small>
                    </div>
                  ))}
                </div>

                <div className="optician-order-footer">
                  <span className="meta-text">
                    {order.is_pickup ? 'Pickup' : <><Truck size={14} /> Delivery</>} · {formatDate(order.created_at)}
                  </span>
                  <select
                    value={order.status}
                    onChange={(event) => onStatusChange(order.id, event.target.value)}
                    disabled={updatingOrderId === order.id}
                    aria-label={`Update order ${order.id} status`}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function InventoryPanel({ inventory, title = 'Optical Inventory', expanded = false }) {
  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>{title}</h3>
        <p>Frame, lens, and accessory stock from the hospital shop inventory.</p>
      </div>

      <div className={`dashboard-list ${expanded ? 'optician-expanded-list' : ''}`}>
        {inventory.length === 0 ? (
          <p className="empty-state">No optical stock records match the current view.</p>
        ) : (
          inventory.map((item) => {
            const isLow = Number(item.stock_level) <= Number(item.reorder_level || 0);
            return (
              <article key={item.id} className="dashboard-list-item">
                <div className="list-top">
                  <div>
                    <strong>{item.product?.name || 'Optical item'}</strong>
                    <p>{item.product?.sku || item.product?.item_type || 'No SKU recorded'}</p>
                  </div>
                  <span className={`status-pill ${isLow ? 'status-warning' : 'status-success'}`}>
                    {isLow ? 'Reorder' : 'In stock'}
                  </span>
                </div>

                <div className="optician-stock-grid">
                  <span><Eye size={14} /> {item.product?.item_type || 'Optical'}</span>
                  <span>Stock: {item.stock_level}</span>
                  <span>Reorder: {item.reorder_level}</span>
                  <span>{item.location || 'No location'}</span>
                </div>

                <div className="optician-order-footer">
                  <span className="meta-text">Supplier: {item.supplier || 'Not recorded'}</span>
                  <span className="meta-text">Unit: {formatCurrency(item.price || item.product?.unit_price)}</span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function getStatusClass(status) {
  if (status === 'COMPLETED') return 'status-success';
  if (status === 'CANCELLED') return 'status-danger';
  if (status === 'PROCESSING') return 'status-info';
  return 'status-warning';
}
