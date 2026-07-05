import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FilePlus2,
  FileText,
  Glasses,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from '../services/api';

const INITIAL_REFRACTION = {
  patient: '',
  notes: '',
  od_sphere: '',
  od_cylinder: '',
  od_axis: '',
  od_add: '',
  os_sphere: '',
  os_cylinder: '',
  os_axis: '',
  os_add: '',
  pupillary_distance: '',
};

const INITIAL_RECORD = {
  patient: '',
  visit_type: 'PHYSICAL_EXAM',
  chief_complaint: '',
  diagnosis_codes: '',
  treatment_plan: '',
  clinical_notes: '',
};

function getPatientName(patient) {
  if (!patient) return 'Patient';
  const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(' ').trim();
  return fullName || patient.username || `Patient #${patient.id}`;
}

function formatDateTime(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function decimalOrNull(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

function integerOrNull(value) {
  return value === '' || value === null || value === undefined ? null : Number.parseInt(value, 10);
}

export default function OptometristDashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [acuityTests, setAcuityTests] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [records, setRecords] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [refractionForm, setRefractionForm] = useState(INITIAL_REFRACTION);
  const [recordForm, setRecordForm] = useState(INITIAL_RECORD);

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

  const loadDashboardData = useCallback(async () => {
    const [summaryData, bookingData, acuityData, prescriptionData, recordData] = await Promise.all([
      api.getOptometristDashboardSummary(),
      api.getBookings(),
      api.getAcuityTests(),
      api.getPrescriptions(),
      api.getMedicalRecords(),
    ]);

    setDashboardSummary(summaryData && typeof summaryData === 'object' ? summaryData : null);
    setAppointments(Array.isArray(bookingData) ? bookingData : []);
    setAcuityTests(Array.isArray(acuityData) ? acuityData : []);
    setPrescriptions(Array.isArray(prescriptionData) ? prescriptionData : []);
    setRecords(Array.isArray(recordData) ? recordData : []);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      await loadDashboardData();
    } catch (error) {
      setMessage(error.message || 'Unable to load optometrist dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [loadDashboardData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  const myAppointments = useMemo(() => (
    appointments.filter((appointment) => String(appointment.doctor) === String(user?.id))
  ), [appointments, user?.id]);

  const myPrescriptions = useMemo(() => (
    prescriptions.filter((prescription) => String(prescription.doctor) === String(user?.id))
  ), [prescriptions, user?.id]);

  const refractionPrescriptions = useMemo(() => (
    myPrescriptions.filter((prescription) => prescription.refraction_details)
  ), [myPrescriptions]);

  const myRecords = useMemo(() => (
    records.filter((record) => String(record.doctor) === String(user?.id))
  ), [records, user?.id]);

  const patientOptions = useMemo(() => {
    const patientMap = new Map();

    [...appointments, ...acuityTests, ...prescriptions, ...records].forEach((entry) => {
      const patient = entry.patient_details;
      const patientId = entry.patient || patient?.id;
      if (!patientId) return;
      patientMap.set(String(patientId), {
        id: patientId,
        label: getPatientName(patient),
      });
    });

    return Array.from(patientMap.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [appointments, acuityTests, prescriptions, records]);

  const filteredAppointments = useMemo(() => filterBySearch(myAppointments, searchTerm, (appointment) => [
    getPatientName(appointment.patient_details),
    appointment.status,
    appointment.slot_details?.slot_type,
    appointment.notes,
  ]), [myAppointments, searchTerm]);

  const filteredAcuityTests = useMemo(() => filterBySearch(acuityTests, searchTerm, (test) => [
    getPatientName(test.patient_details),
    test.od_acuity,
    test.os_acuity,
    test.device_info,
  ]), [acuityTests, searchTerm]);

  const filteredRefractions = useMemo(() => filterBySearch(refractionPrescriptions, searchTerm, (prescription) => [
    getPatientName(prescription.patient_details),
    prescription.notes,
    prescription.is_signed ? 'signed' : 'unsigned',
  ]), [refractionPrescriptions, searchTerm]);

  const filteredRecords = useMemo(() => filterBySearch(myRecords, searchTerm, (record) => [
    getPatientName(record.patient_details),
    record.visit_type,
    record.chief_complaint,
    record.diagnosis_codes,
    record.treatment_plan,
  ]), [myRecords, searchTerm]);

  const handleRefractionSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const created = await api.createPrescription({
        patient: Number(refractionForm.patient),
        notes: refractionForm.notes,
        refraction_details: {
          od_sphere: decimalOrNull(refractionForm.od_sphere),
          od_cylinder: decimalOrNull(refractionForm.od_cylinder),
          od_axis: integerOrNull(refractionForm.od_axis),
          od_add: decimalOrNull(refractionForm.od_add),
          os_sphere: decimalOrNull(refractionForm.os_sphere),
          os_cylinder: decimalOrNull(refractionForm.os_cylinder),
          os_axis: integerOrNull(refractionForm.os_axis),
          os_add: decimalOrNull(refractionForm.os_add),
          pupillary_distance: decimalOrNull(refractionForm.pupillary_distance),
        },
      });
      setPrescriptions((current) => [created, ...current]);
      setDashboardSummary(await api.getOptometristDashboardSummary());
      setRefractionForm(INITIAL_REFRACTION);
      setMessage(`Refraction prescription #${created.id} created.`);
    } catch (error) {
      setMessage(error.message || 'Failed to create refraction prescription.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignPrescription = async (prescriptionId) => {
    setSaving(true);
    setMessage('');
    try {
      await api.signPrescription(prescriptionId);
      await fetchDashboardData();
      setMessage(`Prescription #${prescriptionId} signed.`);
    } catch (error) {
      setMessage(error.message || 'Failed to sign prescription.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const created = await api.createMedicalRecord({
        patient: Number(recordForm.patient),
        visit_type: recordForm.visit_type,
        chief_complaint: recordForm.chief_complaint,
        diagnosis_codes: recordForm.diagnosis_codes,
        treatment_plan: recordForm.treatment_plan,
        clinical_notes: recordForm.clinical_notes,
      });
      setRecords((current) => [created, ...current]);
      setDashboardSummary(await api.getOptometristDashboardSummary());
      setRecordForm(INITIAL_RECORD);
      setMessage(`Clinical record #${created.id} saved.`);
    } catch (error) {
      setMessage(error.message || 'Failed to save clinical record.');
    } finally {
      setSaving(false);
    }
  };

  const navigationItems = [
    { key: 'overview', label: 'Overview', icon: ClipboardList },
    { key: 'appointments', label: 'Appointments', icon: CalendarCheck },
    { key: 'acuity', label: 'Acuity Review', icon: Eye },
    { key: 'refraction', label: 'Refraction', icon: Glasses },
    { key: 'records', label: 'Records', icon: FileText },
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
            <div className="brand-mark"><Eye size={20} /></div>
            <div className="brand-copy">
              <strong>EyeCare</strong>
              <span>Optometry Workspace</span>
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
              placeholder="Search patients, appointments, acuity, prescriptions, records..."
              aria-label="Search optometrist dashboard"
            />
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Acuity reviews" onClick={() => setActiveView('acuity')}>
              <Bell size={20} />
              {Number(dashboardSummary?.abnormal_acuity || 0) > 0 && <span className="icon-badge">{dashboardSummary.abnormal_acuity}</span>}
            </button>
            <button className="icon-button" type="button" aria-label="Refresh dashboard" onClick={fetchDashboardData}>
              <RefreshCw size={20} />
            </button>
            <button className="profile-pill" type="button">
              <div className="profile-avatar">{(user?.first_name || user?.username || 'O')[0]}</div>
              <div>
                <strong>{user?.first_name || user?.username || 'Optometrist'} {user?.last_name || ''}</strong>
                <small>{user?.role || 'OPTOMETRIST'}</small>
              </div>
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          {message && <div className="result-banner status-info">{message}</div>}

          {loading ? (
            <section className="card section-card optometrist-loading">
              <Loader2 className="optometrist-spinner" size={24} />
              Loading optometry records...
            </section>
          ) : (
            <>
              {activeView === 'overview' && (
                <>
                  <section className="overview-grid">
                    <MetricCard icon={CalendarCheck} label="Today's appointments" value={dashboardSummary?.today_appointments} detail="Assigned today" accent="blue" />
                    <MetricCard icon={Activity} label="Acuity tests" value={dashboardSummary?.acuity_tests} detail="Patient portal tests" accent="purple" />
                    <MetricCard icon={ShieldCheck} label="Abnormal acuity" value={dashboardSummary?.abnormal_acuity} detail="Needs clinical review" accent="teal" />
                    <MetricCard icon={Glasses} label="Refractions issued" value={dashboardSummary?.refractions_issued} detail="Created by you" accent="green" />
                  </section>

                  <div className="dashboard-grid two-col">
                    <AppointmentsPanel appointments={filteredAppointments.slice(0, 6)} />
                    <AcuityPanel tests={filteredAcuityTests.slice(0, 6)} />
                  </div>
                </>
              )}

              {activeView === 'appointments' && <AppointmentsPanel appointments={filteredAppointments} expanded />}
              {activeView === 'acuity' && <AcuityPanel tests={filteredAcuityTests} expanded />}
              {activeView === 'refraction' && (
                <RefractionPanel
                  prescriptions={filteredRefractions}
                  patientOptions={patientOptions}
                  form={refractionForm}
                  onFormChange={setRefractionForm}
                  onSubmit={handleRefractionSubmit}
                  onSign={handleSignPrescription}
                  saving={saving}
                />
              )}
              {activeView === 'records' && (
                <RecordsPanel
                  records={filteredRecords}
                  patientOptions={patientOptions}
                  form={recordForm}
                  onFormChange={setRecordForm}
                  onSubmit={handleRecordSubmit}
                  saving={saving}
                />
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

function MetricCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-${accent}`}><Icon size={22} /></div>
      <div>
        <p className="stat-label">{label}</p>
        <h3>{value ?? '—'}</h3>
        <p className="stat-detail">{detail}</p>
      </div>
    </article>
  );
}

function AppointmentsPanel({ appointments, expanded = false }) {
  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>Appointments</h3>
        <p>Optometry appointments assigned to the signed-in clinician.</p>
      </div>
      <div className={`dashboard-list ${expanded ? 'optometrist-expanded-list' : ''}`}>
        {appointments.length === 0 ? (
          <p className="empty-state">No appointments match the current view.</p>
        ) : appointments.map((appointment) => (
          <article key={appointment.id} className="dashboard-list-item">
            <div className="list-top">
              <div>
                <strong>{getPatientName(appointment.patient_details)}</strong>
                <p>{appointment.slot_details?.slot_type || 'Appointment'}</p>
              </div>
              <span className={`status-pill ${getStatusClass(appointment.status)}`}>{appointment.status}</span>
            </div>
            <div className="optometrist-detail-grid">
              <span>{formatDateTime(appointment.slot_details?.start_time)}</span>
              <span>{appointment.notes || 'No appointment notes'}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AcuityPanel({ tests, expanded = false }) {
  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>Visual Acuity Review</h3>
        <p>Patient acuity tests submitted through the patient portal.</p>
      </div>
      <div className={`dashboard-list ${expanded ? 'optometrist-expanded-list' : ''}`}>
        {tests.length === 0 ? (
          <p className="empty-state">No visual acuity tests match the current view.</p>
        ) : tests.map((test) => {
          const abnormal = Boolean(test.requires_review);
          return (
            <article key={test.id} className="dashboard-list-item">
              <div className="list-top">
                <div>
                  <strong>{getPatientName(test.patient_details)}</strong>
                  <p>{formatDateTime(test.test_date)}</p>
                </div>
                <span className={`status-pill ${abnormal ? 'status-warning' : 'status-success'}`}>
                  {abnormal ? 'Review' : 'Normal'}
                </span>
              </div>
              <div className="optometrist-acuity-row">
                <span>OD {test.od_acuity}</span>
                <span>OS {test.os_acuity}</span>
                <span>{test.distance_feet} ft</span>
                <span>{test.is_self_test ? 'Self-test' : 'Clinic verified'}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RefractionPanel({ prescriptions, patientOptions, form, onFormChange, onSubmit, onSign, saving }) {
  return (
    <div className="dashboard-grid two-col">
      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h3>Create Refraction Prescription</h3>
          <p>Select a real patient already present in appointment, acuity, prescription, or record data.</p>
        </div>
        <form className="dashboard-form" onSubmit={onSubmit}>
          <PatientSelect value={form.patient} patientOptions={patientOptions} onChange={(patient) => onFormChange({ ...form, patient })} />
          <div className="form-grid-2">
            <RefractionInput label="OD Sphere" value={form.od_sphere} onChange={(value) => onFormChange({ ...form, od_sphere: value })} required />
            <RefractionInput label="OS Sphere" value={form.os_sphere} onChange={(value) => onFormChange({ ...form, os_sphere: value })} required />
            <RefractionInput label="OD Cylinder" value={form.od_cylinder} onChange={(value) => onFormChange({ ...form, od_cylinder: value })} />
            <RefractionInput label="OS Cylinder" value={form.os_cylinder} onChange={(value) => onFormChange({ ...form, os_cylinder: value })} />
            <RefractionInput label="OD Axis" type="number" value={form.od_axis} onChange={(value) => onFormChange({ ...form, od_axis: value })} />
            <RefractionInput label="OS Axis" type="number" value={form.os_axis} onChange={(value) => onFormChange({ ...form, os_axis: value })} />
            <RefractionInput label="OD Add" value={form.od_add} onChange={(value) => onFormChange({ ...form, od_add: value })} />
            <RefractionInput label="OS Add" value={form.os_add} onChange={(value) => onFormChange({ ...form, os_add: value })} />
          </div>
          <RefractionInput label="Pupillary Distance (mm)" value={form.pupillary_distance} onChange={(value) => onFormChange({ ...form, pupillary_distance: value })} />
          <label className="dashboard-field">
            <span>Clinical Notes</span>
            <textarea className="glass-input" value={form.notes} onChange={(event) => onFormChange({ ...form, notes: event.target.value })} required />
          </label>
          <button className="glass-btn" type="submit" disabled={saving || !form.patient || !form.od_sphere || !form.os_sphere}>
            <FilePlus2 size={18} />
            {saving ? 'Saving...' : 'Create Refraction'}
          </button>
        </form>
      </section>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h3>Issued Refractions</h3>
          <p>Refraction prescriptions created by this optometrist.</p>
        </div>
        <div className="dashboard-list optometrist-expanded-list">
          {prescriptions.length === 0 ? (
            <p className="empty-state">No refraction prescriptions match the current view.</p>
          ) : prescriptions.map((prescription) => (
            <article key={prescription.id} className="dashboard-list-item">
              <div className="list-top">
                <div>
                  <strong>Prescription #{prescription.id}</strong>
                  <p>{getPatientName(prescription.patient_details)}</p>
                </div>
                <span className={`status-pill ${prescription.is_signed ? 'status-success' : 'status-warning'}`}>
                  {prescription.is_signed ? 'Signed' : 'Unsigned'}
                </span>
              </div>
              <div className="optometrist-acuity-row">
                <span>OD {formatLensValue(prescription.refraction_details?.od_sphere)}</span>
                <span>OS {formatLensValue(prescription.refraction_details?.os_sphere)}</span>
                <span>PD {prescription.refraction_details?.pupillary_distance || 'N/A'} mm</span>
              </div>
              {!prescription.is_signed && (
                <button className="glass-btn glass-btn-secondary optometrist-inline-btn" type="button" onClick={() => onSign(prescription.id)} disabled={saving}>
                  Sign Prescription
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RecordsPanel({ records, patientOptions, form, onFormChange, onSubmit, saving }) {
  return (
    <div className="dashboard-grid two-col">
      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h3>Create Clinical Record</h3>
          <p>Save optometry assessment findings to the patient record.</p>
        </div>
        <form className="dashboard-form" onSubmit={onSubmit}>
          <PatientSelect value={form.patient} patientOptions={patientOptions} onChange={(patient) => onFormChange({ ...form, patient })} />
          <label className="dashboard-field">
            <span>Visit Type</span>
            <select className="glass-input" value={form.visit_type} onChange={(event) => onFormChange({ ...form, visit_type: event.target.value })}>
              <option value="PHYSICAL_EXAM">Physical Exam</option>
              <option value="TELECONSULTATION">Remote Video Consultation</option>
              <option value="DIAGNOSTIC_SCAN">Physical Diagnostic / Scan</option>
            </select>
          </label>
          <label className="dashboard-field">
            <span>Chief Complaint</span>
            <textarea className="glass-input" value={form.chief_complaint} onChange={(event) => onFormChange({ ...form, chief_complaint: event.target.value })} required />
          </label>
          <label className="dashboard-field">
            <span>Diagnosis Codes</span>
            <input className="glass-input" value={form.diagnosis_codes} onChange={(event) => onFormChange({ ...form, diagnosis_codes: event.target.value })} />
          </label>
          <label className="dashboard-field">
            <span>Treatment Plan</span>
            <textarea className="glass-input" value={form.treatment_plan} onChange={(event) => onFormChange({ ...form, treatment_plan: event.target.value })} required />
          </label>
          <label className="dashboard-field">
            <span>Clinical Notes</span>
            <textarea className="glass-input" value={form.clinical_notes} onChange={(event) => onFormChange({ ...form, clinical_notes: event.target.value })} />
          </label>
          <button className="glass-btn" type="submit" disabled={saving || !form.patient}>
            <FilePlus2 size={18} />
            {saving ? 'Saving...' : 'Save Record'}
          </button>
        </form>
      </section>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h3>My Clinical Records</h3>
          <p>Records written by this optometrist.</p>
        </div>
        <div className="dashboard-list optometrist-expanded-list">
          {records.length === 0 ? (
            <p className="empty-state">No clinical records match the current view.</p>
          ) : records.map((record) => (
            <article key={record.id} className="dashboard-list-item">
              <div className="list-top">
                <div>
                  <strong>Record #{record.id}</strong>
                  <p>{getPatientName(record.patient_details)}</p>
                </div>
                <span className="status-pill status-info">{record.visit_type}</span>
              </div>
              <p><strong>Complaint:</strong> {record.chief_complaint}</p>
              <p><strong>Plan:</strong> {record.treatment_plan}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PatientSelect({ value, patientOptions, onChange }) {
  return (
    <label className="dashboard-field">
      <span>Patient</span>
      <select className="glass-input" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select patient</option>
        {patientOptions.map((patient) => (
          <option key={patient.id} value={patient.id}>{patient.label}</option>
        ))}
      </select>
    </label>
  );
}

function RefractionInput({ label, value, onChange, type = 'number', required = false }) {
  return (
    <label className="dashboard-field">
      <span>{label}</span>
      <input className="glass-input" type={type} step={type === 'number' ? '0.01' : undefined} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function formatLensValue(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return value;
  return numberValue > 0 ? `+${numberValue.toFixed(2)}` : numberValue.toFixed(2);
}

function getStatusClass(status) {
  if (status === 'COMPLETED') return 'status-success';
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'status-danger';
  if (status === 'IN_PROGRESS') return 'status-info';
  return 'status-warning';
}
