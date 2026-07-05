import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck,
  Eye,
 Calendar,
  DollarSign,
  ShoppingCart,
  User,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronRight,
  LogOut,
  ChevronLeft,
  Search,
  Bell,
  Menu,
  X
} from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function PatientDashboard({ user, onLogout, onOpenShop }) {
  const [activeSection, setActiveSection] = useState('triage');
  const [expandedMenu, setExpandedMenu] = useState('appointments');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [search, setSearch] = useState('');

  // Triage state
  const [symptoms, setSymptoms] = useState({
    blurry_vision: false,
    sudden_loss: false,
    chemical_burn: false,
    pain_level: 0
  });
  const [triageHistory, setTriageHistory] = useState([]);
  const [triageResult, setTriageResult] = useState(null);

  // Acuity state
  const [odAcuity, setOdAcuity] = useState('20/20');
  const [osAcuity, setOsAcuity] = useState('20/20');
  const [acuityHistory, setAcuityHistory] = useState([]);
  const [snellenSize, setSnellenSize] = useState(1);
  const [snellenLetter, setSnellenLetter] = useState('E');

  // Appointments state
  const [availableSlots, setAvailableSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [bookingForm, setBookingForm] = useState({ full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(), phone: user.phone_number || '', reason: '', insurance: '', language: '' });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState([]);

  // Invoices state
  const [invoices, setInvoices] = useState([]);

  // Records and profile state
  const [records, setRecords] = useState([]);
  const [profileData, setProfileData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    phone_number: user.phone_number || '',
    date_of_birth: user.date_of_birth || '',
    gender: user.gender || '',
    address: user.address || ''
  });
  const [profileSuccess, setProfileSuccess] = useState('');

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

  useEffect(() => {
    setProfileData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      date_of_birth: user.date_of_birth || '',
      gender: user.gender || '',
      address: user.address || ''
    });
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [activeSection]);

  const handleSectionSelect = (section) => {
    setActiveSection(section);
    if (section.startsWith('appointments')) {
      setExpandedMenu('appointments');
    }
    // Close mobile sidebar on navigation
    if (window.innerWidth <= 900) setMobileOpen(false);
  };

  const toggleMenu = (menu) => {
    setExpandedMenu(prev => (prev === menu ? null : menu));
  };

  const fetchData = async () => {
    try {
      if (activeSection === 'triage') {
        const res = await api.getTriage();
        setTriageHistory(Array.isArray(res) ? res : []);
      } else if (activeSection === 'acuity') {
        const res = await api.getAcuityTests();
        setAcuityHistory(Array.isArray(res) ? res : []);
      } else if (activeSection.startsWith('appointments')) {
        const slots = await api.getSlots({ is_booked: false });
        setAvailableSlots(Array.isArray(slots) ? slots : []);
        const appts = await api.getBookings();
        setAppointments(Array.isArray(appts) ? appts : []);
      } else if (activeSection === 'records') {
        const res = await api.getMedicalRecords();
        setRecords(Array.isArray(res) ? res : []);
      } else if (activeSection === 'prescriptions') {
        const res = await api.getPrescriptions();
        setPrescriptions(Array.isArray(res) ? res : []);
      } else if (activeSection === 'invoices') {
        const res = await api.getInvoices();
        setInvoices(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      alert('Error fetching data: ' + err.message);
    }
  };

  const handleTriageSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createTriage(symptoms);
      setTriageResult(res);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAcuitySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createAcuityTest({
        od_acuity: odAcuity,
        os_acuity: osAcuity,
        distance_feet: 10,
        device_info: navigator.userAgent
      });
      alert('Visual Acuity Test logged successfully.');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const randomizeSnellen = () => {
    const letters = ['E', 'F', 'P', 'T', 'O', 'Z', 'L', 'P', 'E', 'D'];
    const randomIndex = Math.floor(Math.random() * letters.length);
    setSnellenLetter(letters[randomIndex]);
    setSnellenSize(prev => Math.max(0.2, +(prev - 0.15).toFixed(2)));
  };

  const openBookingForm = (slot) => {
    setBookingSlot(slot);
    setBookingForm({ full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(), phone: user.phone_number || '', reason: '', insurance: '', language: '' });
  };

  const submitBooking = async (slotId) => {
    if (!bookingForm.full_name || !bookingForm.phone || !bookingForm.reason) {
      alert('Please provide your name, phone and reason for visit.');
      return;
    }
    setBookingSubmitting(true);
    try {
      const payload = {
        slot: slotId,
        patient_name: bookingForm.full_name,
        phone_number: bookingForm.phone,
        reason_for_visit: bookingForm.reason,
        insurance: bookingForm.insurance || null,
        language: bookingForm.language || null
      };
      const res = await api.createBooking(payload);
      alert('Appointment booked successfully!');
      // if booking returns room token or url, surface to patient
      if (res?.room_url || res?.token) {
        const roomUrl = res.room_url || (`/telemedicine/${res.id}?token=${encodeURIComponent(res.token || '')}`);
        alert('Booking complete. Join via: ' + roomUrl);
      }
      setBookingSlot(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      await api.updateProfile(profileData);
      setProfileSuccess('Profile updated successfully.');
      setTimeout(() => setProfileSuccess(''), 2500);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className={`doctor-dashboard ${darkMode ? 'dark' : ''}`}>
      {/* Backdrop for mobile sidebar */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><Eye size={20} /></div>
          <div className="brand-copy">
            <strong>EyeCare</strong>
            <span>Patient Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-item ${activeSection === 'triage' ? 'active' : ''}`}
            onClick={() => handleSectionSelect('triage')}
          >
            <ShieldCheck size={18} />
            <span>Symptom Triage</span>
          </button>

          <button
            className={`sidebar-item ${activeSection === 'acuity' ? 'active' : ''}`}
            onClick={() => handleSectionSelect('acuity')}
          >
            <Eye size={18} />
            <span>Visual Acuity Test</span>
          </button>

          <button
            className={`sidebar-item ${activeSection.startsWith('appointments') ? 'active' : ''}`}
            onClick={() => toggleMenu('appointments')}
          >
            <Calendar size={18} />
            <span>Appointments</span>
            <div style={{marginLeft: 'auto'}}>
              {expandedMenu === 'appointments' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          </button>

          {expandedMenu === 'appointments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '32px', marginTop: '-4px', marginBottom: '8px' }}>
              <button
                className={`sidebar-item ${activeSection === 'appointments-view' ? 'active' : ''}`}
                onClick={() => handleSectionSelect('appointments-view')}
                style={{ padding: '8px 12px', fontSize: '0.9em' }}
              >
                <span>View Appointments</span>
              </button>
              <button
                className={`sidebar-item ${activeSection === 'appointments-book' ? 'active' : ''}`}
                onClick={() => handleSectionSelect('appointments-book')}
                style={{ padding: '8px 12px', fontSize: '0.9em' }}
              >
                <span>Book Appointment</span>
              </button>
            </div>
          )}

          <button
            className={`sidebar-item ${activeSection === 'prescriptions' ? 'active' : ''}`}
            onClick={() => handleSectionSelect('prescriptions')}
          >
            <FileText size={18} />
            <span>Prescriptions</span>
          </button>

          <button
            className={`sidebar-item ${activeSection === 'records' ? 'active' : ''}`}
            onClick={() => handleSectionSelect('records')}
          >
            <FileText size={18} />
            <span>Records</span>
          </button>

          <button
            className="sidebar-item"
            onClick={onOpenShop}
          >
            <ShoppingCart size={18} />
            <span>Shop</span>
          </button>

          <button
            className={`sidebar-item ${activeSection === 'invoices' ? 'active' : ''}`}
            onClick={() => handleSectionSelect('invoices')}
          >
            <DollarSign size={18} />
            <span>Billings</span>
          </button>

          <button
            className={`sidebar-item ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => handleSectionSelect('profile')}
          >
            <User size={18} />
            <span>Profile</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-toggle" type="button" onClick={() => setSidebarCollapsed((open) => !open)}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button className="mode-toggle" type="button" onClick={() => setDarkMode((prev) => !prev)}>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              aria-label="Search"
            />
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={20} />
              <span className="icon-badge">0</span>
            </button>
            <button className="profile-pill" type="button">
              <div className="profile-avatar">{(user?.first_name || user?.username || 'P')[0].toUpperCase()}</div>
              <div>
                <strong>{user?.first_name || ''} {user?.last_name || user?.username}</strong>
                <small>Patient</small>
              </div>
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          <div className="content-columns">
            {activeSection === 'triage' && (
            <div className="grid-container">
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3>AI-Powered Symptom Pre-screening</h3>
                <p style={{ marginBottom: '20px' }}>
                  Fill in this short form to let us classify your symptom urgency level.
                </p>

                <form onSubmit={handleTriageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={symptoms.blurry_vision}
                      onChange={e => setSymptoms({ ...symptoms, blurry_vision: e.target.checked })}
                    />
                    Blurry Vision
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={symptoms.sudden_loss}
                      onChange={e => setSymptoms({ ...symptoms, sudden_loss: e.target.checked })}
                    />
                    Sudden Vision Loss
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={symptoms.chemical_burn}
                      onChange={e => setSymptoms({ ...symptoms, chemical_burn: e.target.checked })}
                    />
                    Chemical Eye Splash / Burn
                  </label>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      Eye Pain Level (0 - 10): {symptoms.pain_level}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      style={{ width: '100%' }}
                      value={symptoms.pain_level}
                      onChange={e => setSymptoms({ ...symptoms, pain_level: parseInt(e.target.value) })}
                    />
                  </div>

                  <button type="submit" className="glass-btn">Assess Symptoms</button>
                </form>

                {triageResult && (
                  <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid var(--glass-border)' }}>
                    <h4 style={{ color: triageResult.urgency_level === 'EMERGENCY' ? '#ef4444' : triageResult.urgency_level === 'HIGH' ? '#f59e0b' : '#10b981' }}>
                      <AlertTriangle size={20} style={{ marginRight: 8 }} />
                      Urgency: {triageResult.urgency_level}
                    </h4>
                    <p style={{ marginTop: '8px', color: '#fff' }}>{triageResult.ai_recommendation}</p>
                  </div>
                )}
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                <h3>Triage History</h3>
                <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '16px' }}>
                  {triageHistory.length === 0 ? (
                    <p>No previous triage records found.</p>
                  ) : (
                    triageHistory.map(entry => (
                      <div key={entry.id} style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>Urgency: {entry.urgency_level}</span>
                          <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                            {new Date(entry.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.9em', marginTop: '4px' }}>
                          Recommendation: {entry.ai_recommendation}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'acuity' && (
            <div className="grid-container">
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3>At-Home Vision Test Tool</h3>
                <p>Position yourself 10 feet away. Read the letter below. Reduce size when read correctly.</p>

                <div style={{ background: '#fff', color: '#000', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', margin: '10px 0' }}>
                  <span style={{ fontSize: `${snellenSize * 6}rem`, fontWeight: 'bold', lineHeight: 1 }}>{snellenLetter}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="glass-btn glass-btn-secondary" onClick={() => setSnellenSize(1.5)}>Reset Size</button>
                  <button className="glass-btn" onClick={randomizeSnellen}>Next Letter (Smaller)</button>
                </div>

                <form onSubmit={handleAcuitySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label>Right Eye (OD) Acuity</label>
                      <select className="glass-input" style={{ width: '100%', marginTop: '6px' }} value={odAcuity} onChange={e => setOdAcuity(e.target.value)}>
                        <option value="20/20">20/20 (Normal)</option>
                        <option value="20/25">20/25</option>
                        <option value="20/30">20/30</option>
                        <option value="20/40">20/40</option>
                        <option value="20/50">20/50</option>
                        <option value="20/70">20/70</option>
                        <option value="20/100">20/100</option>
                        <option value="20/200">20/200</option>
                      </select>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label>Left Eye (OS) Acuity</label>
                      <select className="glass-input" style={{ width: '100%', marginTop: '6px' }} value={osAcuity} onChange={e => setOsAcuity(e.target.value)}>
                        <option value="20/20">20/20 (Normal)</option>
                        <option value="20/25">20/25</option>
                        <option value="20/30">20/30</option>
                        <option value="20/40">20/40</option>
                        <option value="20/50">20/50</option>
                        <option value="20/70">20/70</option>
                        <option value="20/100">20/100</option>
                        <option value="20/200">20/200</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="glass-btn">Record Results</button>
                </form>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                <h3>Acuity Log</h3>
                <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '16px' }}>
                  {acuityHistory.length === 0 ? (
                    <p>No previous acuity records found.</p>
                  ) : (
                    acuityHistory.map(test => (
                      <div key={test.id} style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>Right (OD): {test.od_acuity} | Left (OS): {test.os_acuity}</span>
                          <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                            {new Date(test.test_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Device info: {test.device_info}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appointments-view' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>My Bookings</h3>
              <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {appointments.length === 0 ? <p>You have no scheduled appointments.</p> : appointments.map(appt => (
                  <div key={appt.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', background: 'rgba(15, 23, 42, 0.45)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{appt.slot_details?.department_details?.name || 'Department not recorded'}: {appt.slot_details?.slot_type || 'Slot type not recorded'}</strong>
                      <span style={{ fontSize: '0.85em', color: appt.status === 'SCHEDULED' ? '#0ea5e9' : appt.status === 'COMPLETED' ? '#10b981' : '#f59e0b' }}>
                        {appt.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Time: {new Date(appt.slot_details?.start_time || appt.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'appointments-book' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>Available Appointment Slots</h3>
              <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availableSlots.length === 0 ? <p>No slots currently available.</p> : availableSlots.map(slot => (
                  <div key={slot.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.45)' }}>
                    <div>
                      <strong>{slot.department_details?.name || 'Department not recorded'}: {slot.slot_type || 'Slot type not recorded'}</strong>
                      <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Dr. {slot.doctor_details?.first_name || 'Clinician'} ({new Date(slot.start_time).toLocaleString()})
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="glass-btn" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => openBookingForm(slot)}>
                        Book
                      </button>
                      {slot.is_virtual && (
                        <button className="glass-btn glass-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => { alert('This is a virtual slot — patients will be provided a meeting link after booking.'); }}>
                          Virtual Info
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bookingSlot && (
            <div className="glass-card" style={{ padding: '20px', marginTop: '18px' }}>
              <h3>Booking: {bookingSlot.department_details?.name || 'Department not recorded'} — {bookingSlot.slot_type || 'Slot type not recorded'} — {new Date(bookingSlot.start_time).toLocaleString()}</h3>
              <p>Please confirm your details to complete the booking.</p>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                <input className="glass-input" placeholder="Full name" value={bookingForm.full_name} onChange={e => setBookingForm({ ...bookingForm, full_name: e.target.value })} />
                <input className="glass-input" placeholder="Contact phone" value={bookingForm.phone} onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })} />
                <textarea className="glass-input" placeholder="Reason for visit" value={bookingForm.reason} onChange={e => setBookingForm({ ...bookingForm, reason: e.target.value })} />
                <input className="glass-input" placeholder="Insurance (optional)" value={bookingForm.insurance} onChange={e => setBookingForm({ ...bookingForm, insurance: e.target.value })} />
                <input className="glass-input" placeholder="Preferred language (optional)" value={bookingForm.language} onChange={e => setBookingForm({ ...bookingForm, language: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="glass-btn" onClick={() => submitBooking(bookingSlot.id)} disabled={bookingSubmitting}>{bookingSubmitting ? 'Booking…' : 'Confirm Booking'}</button>
                  <button className="glass-btn glass-btn-secondary" onClick={() => setBookingSlot(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'prescriptions' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>My Prescriptions</h3>
              <p>Below is your digital prescription history including refractions and medication guidelines.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '20px' }}>
                {prescriptions.length === 0 ? <p>No prescriptions have been issued to you.</p> : prescriptions.map(presc => (
                  <div key={presc.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '20px', background: 'rgba(15, 23, 42, 0.35)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                      <strong>Prescription #{presc.id}</strong>
                      <span style={{ color: presc.is_signed ? 'var(--accent)' : 'var(--danger)', fontSize: '0.9em', fontWeight: 'bold' }}>
                        {presc.is_signed ? '✓ Digitally Signed' : '✗ Unsigned'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9em', margin: '8px 0' }}>
                      <strong>Doctor:</strong> Dr. {presc.doctor_details?.first_name || 'Clinician'} ({presc.doctor_details?.username})
                    </p>
                    <p style={{ fontSize: '0.9em', margin: '8px 0' }}>
                      <strong>Notes:</strong> {presc.notes || 'None'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'records' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>Medical Records</h3>
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {records.length === 0 ? <p>No medical records available.</p> : records.map(record => (
                  <div key={record.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', background: 'rgba(15, 23, 42, 0.35)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <strong>Record #{record.id}</strong>
                      <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                        {new Date(record.created_at || record.date_created || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ margin: '8px 0' }}><strong>Chief Complaint:</strong> {record.chief_complaint || 'N/A'}</p>
                    <p style={{ margin: '8px 0' }}><strong>Diagnosis:</strong> {record.diagnosis_codes || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'invoices' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>Billing Statements & Invoices</h3>
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {invoices.length === 0 ? <p>No invoices available.</p> : invoices.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', background: 'rgba(15, 23, 42, 0.45)' }}>
                    <div>
                      <strong>Invoice #{inv.id}</strong>
                      <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Issued: {new Date(inv.created_at).toLocaleDateString()} | Amount: {formatCurrency(inv.amount)}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: inv.status === 'PAID' ? 'var(--accent)' : 'var(--danger)' }}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>Patient Profile</h3>
              <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <input type="text" placeholder="First Name" className="glass-input" value={profileData.first_name} onChange={e => setProfileData({ ...profileData, first_name: e.target.value })} required />
                  <input type="text" placeholder="Last Name" className="glass-input" value={profileData.last_name} onChange={e => setProfileData({ ...profileData, last_name: e.target.value })} required />
                </div>

                <input type="email" placeholder="Email" className="glass-input" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} required />
                <input type="tel" placeholder="Phone Number" className="glass-input" value={profileData.phone_number} onChange={e => setProfileData({ ...profileData, phone_number: e.target.value })} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <input type="date" className="glass-input" value={profileData.date_of_birth} onChange={e => setProfileData({ ...profileData, date_of_birth: e.target.value })} />
                  <select className="glass-input" value={profileData.gender} onChange={e => setProfileData({ ...profileData, gender: e.target.value })}>
                    <option value="">Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <textarea placeholder="Address" className="glass-input" value={profileData.address} onChange={e => setProfileData({ ...profileData, address: e.target.value })} style={{ minHeight: '90px' }} />

                <button type="submit" className="glass-btn">Save Profile</button>
                {profileSuccess && <p style={{ color: 'var(--accent)' }}>{profileSuccess}</p>}
              </form>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
