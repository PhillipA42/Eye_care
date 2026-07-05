import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck,
  FileText,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  Package,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
import { api } from '../services/api';

const MEDICINE_TYPES = new Set(['MEDICATION']);
const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

const INITIAL_MEDICINE_FORM = {
  name: '',
  sku: '',
  description: '',
  generic_name: '',
  brand_name: '',
  manufacturer: '',
  strength: '',
  dosage_form: '',
  storage_instructions: '',
  barcode: '',
  unit_price: '',
  stock_level: '',
  reorder_level: 10,
  location: '',
  batch_number: '',
  supplier: '',
  expiry_date: '',
};

function getPatientName(patient) {
  if (!patient) return 'Patient';
  const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(' ').trim();
  return fullName || patient.username || `Patient #${patient.id}`;
}

function getClinicianName(clinician) {
  if (!clinician) return 'Clinician';
  const fullName = [clinician.first_name, clinician.last_name].filter(Boolean).join(' ').trim();
  return fullName || clinician.username || `Clinician #${clinician.id}`;
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

function getDaysUntil(value) {
  if (!value) return null;
  return Math.ceil((new Date(value) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function PharmacistDashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [medicineForm, setMedicineForm] = useState(INITIAL_MEDICINE_FORM);
  const [restockItemId, setRestockItemId] = useState('');
  const [restockAmount, setRestockAmount] = useState(10);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [prescriptionData, inventoryData, orderData] = await Promise.all([
        api.getPrescriptions(),
        api.getShopInventory(),
        api.getOrders(),
      ]);
      setPrescriptions(Array.isArray(prescriptionData) ? prescriptionData : []);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
    } catch (error) {
      setMessage(error.message || 'Unable to load pharmacist dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  const medicineInventory = useMemo(() => (
    inventory.filter((item) => MEDICINE_TYPES.has(item.product?.item_type))
  ), [inventory]);

  const medicationOrders = useMemo(() => (
    orders.filter((order) => order.items?.some((item) => MEDICINE_TYPES.has(item.product?.item_type)))
  ), [orders]);

  const pendingPrescriptions = useMemo(() => (
    prescriptions.filter((prescription) => !prescription.refraction_details)
  ), [prescriptions]);

  const activeMedicationOrders = useMemo(() => (
    medicationOrders.filter((order) => ['PENDING', 'PROCESSING'].includes(order.status))
  ), [medicationOrders]);

  const lowStockItems = useMemo(() => (
    medicineInventory.filter((item) => Number(item.stock_level || 0) <= Number(item.reorder_level || 0))
  ), [medicineInventory]);

  const expiringItems = useMemo(() => (
    medicineInventory.filter((item) => {
      const days = getDaysUntil(item.expiry_date);
      return days !== null && days >= 0 && days <= 30;
    })
  ), [medicineInventory]);

  const inventoryValue = useMemo(() => (
    medicineInventory.reduce((total, item) => {
      const price = Number(item.price || item.product?.unit_price || 0);
      return total + price * Number(item.stock_level || 0);
    }, 0)
  ), [medicineInventory]);

  const filteredPrescriptions = useMemo(() => filterBySearch(pendingPrescriptions, searchTerm, (prescription) => [
    prescription.id,
    getPatientName(prescription.patient_details),
    getClinicianName(prescription.doctor_details),
    prescription.notes,
    prescription.is_signed ? 'signed' : 'unsigned',
    ...(prescription.medication_items || []).map((item) => item.drug_name),
  ]), [pendingPrescriptions, searchTerm]);

  const filteredInventory = useMemo(() => filterBySearch(medicineInventory, searchTerm, (item) => [
    item.product?.name,
    item.product?.sku,
    item.product?.generic_name,
    item.product?.brand_name,
    item.product?.manufacturer,
    item.batch_number,
    item.supplier,
    item.location,
  ]), [medicineInventory, searchTerm]);

  const filteredOrders = useMemo(() => filterBySearch(medicationOrders, searchTerm, (order) => [
    order.id,
    order.status,
    getPatientName(order.patient_details),
    order.delivery_address,
    ...(order.items || []).map((item) => item.product?.name),
  ]), [medicationOrders, searchTerm]);

  const handleAddMedicine = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const createdProduct = await api.createShopProduct({
        name: medicineForm.name,
        sku: medicineForm.sku,
        description: medicineForm.description,
        item_type: 'MEDICATION',
        unit_price: Number(medicineForm.unit_price || 0),
        is_prescription_required: true,
        generic_name: medicineForm.generic_name,
        brand_name: medicineForm.brand_name,
        manufacturer: medicineForm.manufacturer,
        strength: medicineForm.strength,
        dosage_form: medicineForm.dosage_form,
        storage_instructions: medicineForm.storage_instructions,
        barcode: medicineForm.barcode,
      });

      await api.createShopInventory({
        product_id: createdProduct.id,
        stock_level: Number.parseInt(medicineForm.stock_level || 0, 10),
        location: medicineForm.location,
        batch_number: medicineForm.batch_number,
        supplier: medicineForm.supplier,
        reorder_level: Number.parseInt(medicineForm.reorder_level || 0, 10),
        expiry_date: medicineForm.expiry_date || null,
        price: Number(medicineForm.unit_price || 0),
      });

      setMedicineForm(INITIAL_MEDICINE_FORM);
      setMessage(`${createdProduct.name} was added to pharmacy inventory.`);
      await fetchDashboardData();
      setActiveView('inventory');
    } catch (error) {
      setMessage(error.message || 'Failed to add medicine.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestock = async (event) => {
    event.preventDefault();
    const item = medicineInventory.find((inventoryItem) => String(inventoryItem.id) === String(restockItemId));
    if (!item) {
      setMessage('Choose a medicine to restock.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const nextStock = Number(item.stock_level || 0) + Number(restockAmount || 0);
      await api.updateShopInventory(item.id, { stock_level: nextStock });
      setRestockItemId('');
      setRestockAmount(10);
      setMessage(`${item.product?.name || 'Medicine'} restocked to ${nextStock} units.`);
      await fetchDashboardData();
    } catch (error) {
      setMessage(error.message || 'Restock failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleOrderStatusChange = async (orderId, status) => {
    setUpdatingOrderId(orderId);
    setMessage('');
    try {
      const updatedOrder = await api.updateOrder(orderId, { status });
      setOrders((currentOrders) => currentOrders.map((order) => (order.id === orderId ? updatedOrder : order)));
      setMessage(`Order #${orderId} updated to ${status.toLowerCase()}.`);
    } catch (error) {
      setMessage(error.message || 'Order update failed.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const navigationItems = [
    { key: 'overview', label: 'Dashboard', icon: LayoutGrid },
    { key: 'prescriptions', label: 'Prescriptions', icon: FileText },
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'orders', label: 'Orders', icon: ShoppingBag },
    { key: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { key: 'add', label: 'Add Medicine', icon: Plus },
  ];

  const alertCount = lowStockItems.length + expiringItems.length;

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
            <div className="brand-mark"><Pill size={20} /></div>
            <div className="brand-copy">
              <strong>EyeCare</strong>
              <span>Pharmacy Workspace</span>
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
              placeholder="Search prescriptions, medicine, patients, orders..."
              aria-label="Search pharmacist dashboard"
            />
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Alerts" onClick={() => setActiveView('alerts')}>
              <Bell size={20} />
              {alertCount > 0 && <span className="icon-badge">{alertCount}</span>}
            </button>
            <button className="icon-button" type="button" aria-label="Refresh dashboard" onClick={fetchDashboardData}>
              <RefreshCw size={20} />
            </button>
            <button className="profile-pill" type="button">
              <div className="profile-avatar">{(user?.first_name || user?.username || 'P')[0]}</div>
              <div>
                <strong>{user?.first_name || user?.username || 'Pharmacist'} {user?.last_name || ''}</strong>
                <small>{user?.role || 'PHARMACIST'}</small>
              </div>
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          {message && <div className="result-banner status-info">{message}</div>}

          {loading ? (
            <section className="card section-card staff-loading">
              <Loader2 className="staff-spinner" size={24} />
              Loading pharmacy records...
            </section>
          ) : (
            <>
              {activeView === 'overview' && (
                <>
                  <section className="overview-grid">
                    <StatCard icon={FileText} title="Medication Prescriptions" value={pendingPrescriptions.length} detail="Live prescription records" accent="blue" />
                    <StatCard icon={Package} title="Medicine Stock Items" value={medicineInventory.length} detail={formatCurrency(inventoryValue)} accent="purple" />
                    <StatCard icon={AlertTriangle} title="Stock Alerts" value={alertCount} detail={`${lowStockItems.length} low, ${expiringItems.length} expiring`} accent="teal" />
                    <StatCard icon={Truck} title="Active Orders" value={activeMedicationOrders.length} detail={`${medicationOrders.length} medication orders`} accent="green" />
                  </section>

                  <section className="quick-actions">
                    <QuickAction icon={FileText} label="Review Prescriptions" onClick={() => setActiveView('prescriptions')} />
                    <QuickAction icon={Package} label="Restock Inventory" onClick={() => setActiveView('inventory')} />
                    <QuickAction icon={ShoppingBag} label="Manage Orders" onClick={() => setActiveView('orders')} />
                    <QuickAction icon={Plus} label="Add Medicine" onClick={() => setActiveView('add')} />
                  </section>

                  <div className="content-columns">
                    <PrescriptionsPanel prescriptions={filteredPrescriptions.slice(0, 6)} />
                    <aside className="sidebar-column">
                      <InventoryPanel inventory={lowStockItems.slice(0, 5)} title="Low Stock Medicines" />
                      <InventoryPanel inventory={expiringItems.slice(0, 5)} title="Expiring Soon" />
                    </aside>
                  </div>
                </>
              )}

              {activeView === 'prescriptions' && <PrescriptionsPanel prescriptions={filteredPrescriptions} expanded />}
              {activeView === 'inventory' && (
                <div className="content-columns">
                  <InventoryPanel inventory={filteredInventory} title="Medicine Inventory" expanded />
                  <RestockPanel
                    inventory={medicineInventory}
                    restockItemId={restockItemId}
                    restockAmount={restockAmount}
                    onItemChange={setRestockItemId}
                    onAmountChange={setRestockAmount}
                    onSubmit={handleRestock}
                    saving={saving}
                  />
                </div>
              )}
              {activeView === 'orders' && (
                <OrdersPanel orders={filteredOrders} onStatusChange={handleOrderStatusChange} updatingOrderId={updatingOrderId} expanded />
              )}
              {activeView === 'alerts' && (
                <div className="dashboard-grid two-col">
                  <InventoryPanel inventory={lowStockItems} title="Low Stock Medicines" expanded />
                  <InventoryPanel inventory={expiringItems} title="Expiring Within 30 Days" expanded />
                </div>
              )}
              {activeView === 'add' && (
                <MedicineForm form={medicineForm} onChange={setMedicineForm} onSubmit={handleAddMedicine} saving={saving} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function filterBySearch(items, searchTerm, valuesFactory) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) => valuesFactory(item).filter(Boolean).join(' ').toLowerCase().includes(term));
}

function StatCard({ icon: Icon, title, value, detail, accent }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-${accent}`}><Icon size={22} /></div>
      <div>
        <p className="stat-label">{title}</p>
        <h3>{value ?? '—'}</h3>
        <p className="stat-detail">{detail}</p>
      </div>
    </article>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button className="action-card" type="button" onClick={onClick}>
      <span className="action-icon"><Icon size={18} /></span>
      <span>{label}</span>
    </button>
  );
}

function PrescriptionsPanel({ prescriptions, expanded = false }) {
  return (
    <section className="card section-card">
      <div className="section-header">
        <div>
          <h2>Medication Prescriptions</h2>
          <p>Digital prescriptions from the clinical system.</p>
        </div>
      </div>
      <div className={`dashboard-list ${expanded ? 'staff-expanded-list' : ''}`}>
        {prescriptions.length === 0 ? (
          <p className="empty-state">No medication prescriptions match the current view.</p>
        ) : prescriptions.map((prescription) => (
          <article key={prescription.id} className="dashboard-list-item">
            <div className="list-top">
              <div>
                <strong>Prescription #{prescription.id}</strong>
                <p>{getPatientName(prescription.patient_details)} · {getClinicianName(prescription.doctor_details)}</p>
              </div>
              <span className={`status-pill ${prescription.is_signed ? 'status-success' : 'status-warning'}`}>
                {prescription.is_signed ? <><FileCheck size={14} /> Signed</> : <><Clock size={14} /> Unsigned</>}
              </span>
            </div>
            <MedicationItems items={prescription.medication_items || []} />
            <p>{prescription.notes || 'No prescription notes recorded.'}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MedicationItems({ items }) {
  if (!items.length) {
    return <p className="meta-text">No medication line items recorded.</p>;
  }

  return (
    <div className="staff-chip-row">
      {items.map((item) => (
        <span key={item.id} className="staff-chip">
          {item.drug_name} · {item.dosage} · {item.frequency}
        </span>
      ))}
    </div>
  );
}

function InventoryPanel({ inventory, title, expanded = false }) {
  return (
    <section className="card section-card">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p>Live medicine stock from hospital inventory.</p>
        </div>
      </div>
      <div className={`dashboard-list ${expanded ? 'staff-expanded-list' : ''}`}>
        {inventory.length === 0 ? (
          <p className="empty-state">No medicine inventory records match this view.</p>
        ) : inventory.map((item) => {
          const isLow = Number(item.stock_level || 0) <= Number(item.reorder_level || 0);
          const daysUntilExpiry = getDaysUntil(item.expiry_date);
          const expiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
          return (
            <article key={item.id} className="dashboard-list-item">
              <div className="list-top">
                <div>
                  <strong>{item.product?.name || 'Medicine'}</strong>
                  <p>{item.product?.generic_name || item.product?.sku || 'No generic name recorded'}</p>
                </div>
                <span className={`status-pill ${isLow || expiringSoon ? 'status-warning' : 'status-success'}`}>
                  {isLow ? 'Reorder' : expiringSoon ? 'Expiring' : 'In stock'}
                </span>
              </div>
              <div className="staff-detail-grid">
                <span>Stock: {item.stock_level}</span>
                <span>Reorder: {item.reorder_level}</span>
                <span>Batch: {item.batch_number || 'Not recorded'}</span>
                <span>Expiry: {formatDate(item.expiry_date)}</span>
              </div>
              <p>Supplier: {item.supplier || 'Not recorded'} · Location: {item.location || 'No location'}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OrdersPanel({ orders, onStatusChange, updatingOrderId, expanded = false }) {
  return (
    <section className="card section-card">
      <div className="section-header">
        <div>
          <h2>Medication Orders</h2>
          <p>Patient shop orders containing medication items.</p>
        </div>
      </div>
      <div className={`dashboard-list ${expanded ? 'staff-expanded-list' : ''}`}>
        {orders.length === 0 ? (
          <p className="empty-state">No medication orders match the current view.</p>
        ) : orders.map((order) => {
          const medicineItems = order.items?.filter((item) => MEDICINE_TYPES.has(item.product?.item_type)) || [];
          return (
            <article key={order.id} className="dashboard-list-item">
              <div className="list-top">
                <div>
                  <strong>Order #{order.id}</strong>
                  <p>{getPatientName(order.patient_details)} · {formatCurrency(order.total_amount)}</p>
                </div>
                <span className={`status-pill ${getStatusClass(order.status)}`}>{order.status}</span>
              </div>
              <div className="staff-chip-row">
                {medicineItems.map((item) => (
                  <span key={item.id} className="staff-chip">{item.product?.name || 'Medicine'} x{item.quantity}</span>
                ))}
              </div>
              <div className="staff-order-footer">
                <span className="meta-text">{order.is_pickup ? 'Pickup' : <><Truck size={14} /> Delivery</>} · {formatDate(order.created_at)}</span>
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
        })}
      </div>
    </section>
  );
}

function RestockPanel({ inventory, restockItemId, restockAmount, onItemChange, onAmountChange, onSubmit, saving }) {
  return (
    <section className="card section-card">
      <div className="section-header">
        <div>
          <h2>Receive Stock</h2>
          <p>Increase stock on an existing inventory batch.</p>
        </div>
      </div>
      <form className="dashboard-form" onSubmit={onSubmit}>
        <label className="dashboard-field">
          <span>Medicine batch</span>
          <select className="glass-input" value={restockItemId} onChange={(event) => onItemChange(event.target.value)} required>
            <option value="">Select medicine</option>
            {inventory.map((item) => (
              <option key={item.id} value={item.id}>
                {item.product?.name || 'Medicine'} · Batch {item.batch_number || item.id} · Current {item.stock_level}
              </option>
            ))}
          </select>
        </label>
        <label className="dashboard-field">
          <span>Quantity received</span>
          <input className="glass-input" type="number" min="1" value={restockAmount} onChange={(event) => onAmountChange(event.target.value)} required />
        </label>
        <button className="glass-btn" type="submit" disabled={saving}>
          <Package size={18} />
          {saving ? 'Saving...' : 'Update Stock'}
        </button>
      </form>
    </section>
  );
}

function MedicineForm({ form, onChange, onSubmit, saving }) {
  const updateField = (field, value) => onChange({ ...form, [field]: value });

  return (
    <section className="card section-card">
      <div className="section-header">
        <div>
          <h2>Add Medicine</h2>
          <p>Create a real product and inventory batch in the shop database.</p>
        </div>
      </div>
      <form className="dashboard-form" onSubmit={onSubmit}>
        <div className="form-grid-2">
          <TextField label="Medicine Name" value={form.name} onChange={(value) => updateField('name', value)} required />
          <TextField label="SKU" value={form.sku} onChange={(value) => updateField('sku', value)} required />
          <TextField label="Generic Name" value={form.generic_name} onChange={(value) => updateField('generic_name', value)} />
          <TextField label="Brand Name" value={form.brand_name} onChange={(value) => updateField('brand_name', value)} />
          <TextField label="Manufacturer" value={form.manufacturer} onChange={(value) => updateField('manufacturer', value)} />
          <TextField label="Strength" value={form.strength} onChange={(value) => updateField('strength', value)} />
          <TextField label="Dosage Form" value={form.dosage_form} onChange={(value) => updateField('dosage_form', value)} />
          <TextField label="Barcode" value={form.barcode} onChange={(value) => updateField('barcode', value)} />
          <TextField label="Unit Price" type="number" value={form.unit_price} onChange={(value) => updateField('unit_price', value)} required />
          <TextField label="Opening Stock" type="number" value={form.stock_level} onChange={(value) => updateField('stock_level', value)} required />
          <TextField label="Reorder Level" type="number" value={form.reorder_level} onChange={(value) => updateField('reorder_level', value)} required />
          <TextField label="Location" value={form.location} onChange={(value) => updateField('location', value)} />
          <TextField label="Batch Number" value={form.batch_number} onChange={(value) => updateField('batch_number', value)} />
          <TextField label="Supplier" value={form.supplier} onChange={(value) => updateField('supplier', value)} />
          <TextField label="Expiry Date" type="date" value={form.expiry_date} onChange={(value) => updateField('expiry_date', value)} />
        </div>
        <label className="dashboard-field">
          <span>Storage Instructions</span>
          <textarea className="glass-input" value={form.storage_instructions} onChange={(event) => updateField('storage_instructions', event.target.value)} />
        </label>
        <label className="dashboard-field">
          <span>Description</span>
          <textarea className="glass-input" value={form.description} onChange={(event) => updateField('description', event.target.value)} />
        </label>
        <button className="glass-btn" type="submit" disabled={saving}>
          <Plus size={18} />
          {saving ? 'Saving...' : 'Add Medicine'}
        </button>
      </form>
    </section>
  );
}

function TextField({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="dashboard-field">
      <span>{label}</span>
      <input className="glass-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function getStatusClass(status) {
  if (status === 'COMPLETED') return 'status-success';
  if (status === 'CANCELLED') return 'status-danger';
  if (status === 'PROCESSING') return 'status-info';
  return 'status-warning';
}
