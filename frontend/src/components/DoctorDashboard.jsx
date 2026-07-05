import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Eye,
  LayoutGrid,
  CalendarCheck,
  Users,
  Video,
  Pill,
  FileText,
  ShieldCheck,
  Search,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';

// dynamic overview values will be loaded from the API
const defaultOverview = [
  { title: "Today's Appointments", value: '—', detail: '', icon: CalendarCheck, accent: 'blue' },
  { title: 'Patients Waiting', value: '—', detail: '', icon: Users, accent: 'purple' },
  { title: 'Active Consultations', value: '—', detail: '', icon: Video, accent: 'teal' },
  { title: 'Prescriptions Issued', value: '—', detail: '', icon: Pill, accent: 'green' }
];

// placeholder until API loads
const defaultAppointments = [];

const quickActions = [
  { key: 'video', label: 'Start video consult', icon: Video },
  { key: 'prescription', label: 'Create new prescription', icon: Pill },
  { key: 'queue', label: 'Review patient queue', icon: Users },
  { key: 'ehr', label: 'Open EHR records', icon: FileText }
];

const statusClass = (status) => {
  switch (status) {
    case 'Waiting': return 'badge-warning';
    case 'Scheduled': return 'badge-blue';
    case 'In Progress': return 'badge-amber';
    case 'Completed': return 'badge-green';
    default: return 'badge-soft';
  }
};
 
export default function DoctorDashboard({ user, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  // Auto-collapse on small screens, close overlay on resize up
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

  const handleNavClick = (viewKey) => {
    setView(viewKey);
    if (window.innerWidth <= 900) setMobileOpen(false);
  };

  const [overview, setOverview] = useState(defaultOverview);
  const [appointments, setAppointments] = useState(defaultAppointments);
  const [queue, setQueue] = useState([]);
  const [prescriptionsCount, setPrescriptionsCount] = useState(0);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('overview'); // 'overview' | 'appointments' | 'slots' | 'queue' | 'patients' | 'records' | 'settings'

  const [slots, setSlots] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [slotTypes, setSlotTypes] = useState([]);
  const [newSlot, setNewSlot] = useState({ start_time: '', duration_minutes: 30, slot_type: '', department: '', capacity: 1, is_virtual: false });

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    const load = async () => {
      try {
        const [bookings, q, prescs, recs] = await Promise.all([
          api.getBookings(),
          api.getQueue(),
          api.getPrescriptions(),
          api.getMedicalRecords()
        ]);

        // filter bookings to this doctor
        const myBookings = (bookings || []).filter(b => String(b.doctor) === String(user.id));

        // Today's appointments (upcoming for today)
        const today = new Date();
        const todays = myBookings.filter(b => {
          const s = b.slot_details?.start_time || b.start_time;
          if (!s) return false;
          const d = new Date(s);
          return d.toDateString() === today.toDateString();
        }).map(b => ({
          id: b.id,
          patient: b.patient_details?.username || b.patient || 'Unknown',
          time: b.slot_details?.start_time ? new Date(b.slot_details.start_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : (b.time || ''),
          type: b.slot_details?.slot_type || b.visit_type || 'Clinic',
          status: b.status || (b.is_active ? 'In Progress' : 'Scheduled'),
          priority: b.priority || 'Normal'
        }));

        setAppointments(todays);
        setQueue(q || []);
        setPrescriptionsCount((prescs || []).length || 0);
        setRecords(recs || []);

        // build overview
        setOverview([
          { title: "Today's Appointments", value: String(todays.length), detail: `${myBookings.length} total`, icon: CalendarCheck, accent: 'blue' },
          { title: 'Patients Waiting', value: String((q || []).length), detail: 'Active queue', icon: Users, accent: 'purple' },
          { title: 'Active Consultations', value: String(myBookings.filter(b => b.status === 'in_progress' || b.status === 'In Progress').length), detail: '', icon: Video, accent: 'teal' },
          { title: 'Prescriptions Issued', value: String((prescs || []).length), detail: 'Recent prescriptions', icon: Pill, accent: 'green' }
        ]);
      } catch (err) {
        console.error('Dashboard load error', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [departmentData, slotTypeData] = await Promise.all([
          api.getDepartments(),
          api.getSlotTypes()
        ]);
        const clinicalDepartments = Array.isArray(departmentData)
          ? departmentData.filter(department => department.is_clinical)
          : [];
        const types = Array.isArray(slotTypeData) ? slotTypeData : [];
        const staffDepartment = user?.staff_profile?.department || user?.staff_profile?.department_details?.id || '';

        setDepartments(clinicalDepartments);
        setSlotTypes(types);
        setNewSlot(prev => ({
          ...prev,
          department: prev.department || String(staffDepartment || clinicalDepartments[0]?.id || ''),
          slot_type: prev.slot_type || types[0]?.value || ''
        }));
      } catch (err) {
        console.error('Failed loading department options', err);
      }
    };
    loadOptions();
  }, [user]);

  // load doctor's slots separately
  useEffect(() => {
    if (!user?.id) return;
    const loadSlots = async () => {
      try {
        const s = await api.getSlots({ doctor: user.id });
        setSlots(Array.isArray(s) ? s : []);
      } catch (err) {
        console.error('Failed loading slots', err);
      }
    };
    loadSlots();
  }, [user]);

  const handleCreateSlot = async (e) => {
    e && e.preventDefault();
    try {
      const payload = {
        doctor: user.id,
        department: newSlot.department ? Number(newSlot.department) : null,
        start_time: newSlot.start_time,
        duration_minutes: Number(newSlot.duration_minutes) || 30,
        slot_type: newSlot.slot_type,
        capacity: Number(newSlot.capacity) || 1,
        is_virtual: !!newSlot.is_virtual
      };
      const created = await api.createSlot(payload);
      setSlots(prev => [created, ...prev]);
      alert('Slot created and published for patients to book.');
      setNewSlot(prev => ({ ...prev, start_time: '', duration_minutes: 30, capacity: 1, is_virtual: false }));
    } catch (err) {
      alert('Failed creating slot: ' + err.message);
    }
  };

  const handleQuickAction = (key) => {
    switch (key) {
      case 'video':
        setView('appointments');
        break;
      case 'prescription':
        setView('records');
        break;
      case 'queue':
        setView('queue');
        break;
      case 'ehr':
        setView('patients');
        break;
      default:
        setView('overview');
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
            <span>Doctor Workspace</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
            { key: 'appointments', label: 'Appointments', icon: CalendarCheck },
            { key: 'patients', label: 'Patients', icon: Users },
            { key: 'records', label: 'Records', icon: FileText },
            { key: 'settings', label: 'Settings', icon: ShieldCheck }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`sidebar-item ${view === (item.key === 'dashboard' ? 'overview' : item.key) ? 'active' : ''}`}
                type="button"
                onClick={() => handleNavClick(item.key === 'dashboard' ? 'overview' : item.key)}
                title={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
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
              placeholder="Search patients, records or appointments..."
              aria-label="Search dashboard"
            />
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={20} />
              <span className="icon-badge">5</span>
            </button>
            <button className="profile-pill" type="button">
              <div className="profile-avatar">{(user?.first_name || 'D')[0]}</div>
              <div>
                <strong>{user?.first_name || 'Dr.'} {user?.last_name || 'Ophthalmic'}</strong>
                <small>{user?.role || 'Ophthalmologist'}</small>
              </div>
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="overview-grid">
            {(overview || defaultOverview).map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="stat-card">
                  <div className={`stat-icon stat-${card.accent}`}><Icon size={22} /></div>
                  <div>
                    <p className="stat-label">{card.title}</p>
                    <h3>{card.value}</h3>
                    <p className="stat-detail">{card.detail}</p>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="quick-actions">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.key} className="action-card" type="button" onClick={() => handleQuickAction(action.key)}>
                  <span className="action-icon"><Icon size={18} /></span>
                  <span>{action.label}</span>
                  <ArrowRight size={16} />
                </button>
              );
            })}
          </section>

          <div className="content-columns">
            <section className="card section-card">
              <div className="section-header">
                <div>
                  <h2>Today's Appointments</h2>
                  <p>Review the clinic flow and prioritize care.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="button-outline" type="button" onClick={() => setView('appointments')}>View schedule</button>
                  <button className="button-primary" type="button" onClick={() => setView('slots')}>Manage slots</button>
                </div>
              </div>

              <div className="table-wrap">
                <table className="appointments-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length === 0 && !loading ? (
                      <tr><td colSpan={5} style={{ padding: '18px' }}>No appointments for today.</td></tr>
                    ) : (
                      appointments.map((appt) => (
                        <tr key={appt.id || appt.patient}>
                          <td>{appt.patient}</td>
                          <td>{appt.time}</td>
                          <td>{appt.type}</td>
                          <td><span className={`badge ${statusClass(appt.status)}`}>{appt.status}</span></td>
                          <td>{appt.priority}</td>
                          <td>
                            {appt.type && appt.type.toLowerCase().includes('tele') && (
                              <button className="glass-btn glass-btn-mini" onClick={async () => {
                                try {
                                  const tokenResp = await api.getRoomToken(appt.id);
                                  // tokenResp expected to contain { token, room_url }
                                  const url = tokenResp.room_url || (`/telemedicine/${appt.id}?token=${encodeURIComponent(tokenResp.token || '')}`);
                                  window.open(url, '_blank');
                                } catch (err) {
                                  alert('Unable to start/join consult: ' + err.message);
                                }
                              }}>Join</button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            {view === 'slots' && (
              <section className="card section-card" style={{ marginTop: 18 }}>
                <div className="section-header">
                  <div>
                    <h2>Availability / Slots</h2>
                    <p>Publish slots so patients can book appointments.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
                  <div>
                    <form onSubmit={handleCreateSlot} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      <label>Start Time</label>
                      <input type="datetime-local" className="glass-input" value={newSlot.start_time} onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })} required />
                      <label>Duration (minutes)</label>
                      <input type="number" className="glass-input" value={newSlot.duration_minutes} onChange={e => setNewSlot({ ...newSlot, duration_minutes: e.target.value })} />
                      <label>Department</label>
                      <select className="glass-input" value={newSlot.department} onChange={e => setNewSlot({ ...newSlot, department: e.target.value })} required>
                        <option value="">Select department</option>
                        {departments.map(department => (
                          <option key={department.id} value={department.id}>{department.name}</option>
                        ))}
                      </select>
                      <label>Slot Type</label>
                      <select className="glass-input" value={newSlot.slot_type} onChange={e => setNewSlot({ ...newSlot, slot_type: e.target.value })} required>
                        <option value="">Select slot type</option>
                        {slotTypes.map(slotType => (
                          <option key={slotType.value} value={slotType.value}>{slotType.label}</option>
                        ))}
                      </select>
                      <label>Capacity</label>
                      <input type="number" className="glass-input" value={newSlot.capacity} onChange={e => setNewSlot({ ...newSlot, capacity: e.target.value })} />
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="checkbox" checked={newSlot.is_virtual} onChange={e => setNewSlot({ ...newSlot, is_virtual: e.target.checked })} /> Virtual slot
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="glass-btn">Create Slot</button>
                        <button type="button" className="glass-btn glass-btn-secondary" onClick={() => setNewSlot(prev => ({ ...prev, start_time: '', duration_minutes: 30, capacity: 1, is_virtual: false }))}>Reset</button>
                      </div>
                    </form>

                    <div style={{ marginTop: 6 }}>
                      <h4>Published Slots</h4>
                      {slots.length === 0 ? <p>No slots published.</p> : slots.map(s => (
                        <div key={s.id} style={{ border: '1px solid var(--glass-border)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>{s.department_details?.name ? `${s.department_details.name} • ` : ''}{s.slot_type} {s.is_virtual ? '• Virtual' : ''}</strong>
                            <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>{new Date(s.start_time).toLocaleString()}</span>
                          </div>
                          <div style={{ marginTop: 6 }}>
                            Capacity: {s.capacity} | Booked: {s.bookings_count || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <aside style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: 12 }}>
                    <h4>Patient Booking Fields</h4>
                    <p style={{ fontSize: '0.95em' }}>To improve bookings, patients will be required to provide:</p>
                    <ul style={{ marginTop: 8 }}>
                      <li>Full name</li>
                      <li>Contact phone</li>
                      <li>Reason for visit / symptoms</li>
                      <li>Insurance (optional)</li>
                      <li>Preferred language (optional)</li>
                    </ul>
                    <p style={{ marginTop: 12 }}>These fields are enforced on the patient booking flow in the patient dashboard.</p>
                  </aside>
                </div>
              </section>
            )}
            <aside className="sidebar-column">
              <section className="card profile-card">
                <strong>Doctor profile</strong>
                <div className="profile-card-body">
                  <div className="profile-avatar-large">{(user?.first_name || 'D')[0]}{(user?.last_name || 'R')[0]}</div>
                  <strong>{user?.first_name || 'Dr.'} {user?.last_name || 'Doctor'}</strong>
                  <small>{user?.role || 'Ophthalmologist'}</small>
                  <ul className="profile-stats">
                    <li><span>14</span><small>Years</small></li>
                    <li><span>28</span><small>Patients/day</small></li>
                    <li><span>98%</span><small>Completion</small></li>
                  </ul>
                </div>
              </section>

              <section className="card assistant-card">
                <strong>Clinical alerts</strong>
                <div className="assistant-note">Retinal screening due for 3 high-risk patients today.</div>
                <div className="assistant-note">Medication refill requested for Olivia Chen.</div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
