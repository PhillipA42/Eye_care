import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import ReceptionistDashboard from './components/ReceptionistDashboard';
import PharmacistDashboard from './components/PharmacistDashboard';
import Shop from './components/Shop';
import heroImage from './assets/nurse.png';
import { Eye, LogIn, UserPlus } from 'lucide-react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [authMode, setAuthMode] = useState('register');

  // controls what is shown inside patient dashboard area
  const [patientView, setPatientView] = useState('dashboard'); // 'dashboard' | 'shop'
  const [treatmentSection, setTreatmentSection] = useState(''); // '' | 'inpatient' | 'outpatient'

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const getInitialLandingSection = () => {
    if (typeof window === 'undefined') return 'home';
    const hashSection = window.location.hash.replace('#', '');
    return ['home', 'about', 'services', 'contact', 'dashboard'].includes(hashSection) ? hashSection : 'home';
  };
  const [landingSection, setLandingSection] = useState(getInitialLandingSection);
  const [historyEntries, setHistoryEntries] = useState(['home']);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [inpatientForm, setInpatientForm] = useState({
    reason_for_admission: '',
    admission_date: '',
    preferred_treatment_date: '',
    preferred_treatment_time: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_provider: '',
    symptoms_summary: ''
  });
  const [outpatientForm, setOutpatientForm] = useState({
    visit_reason: '',
    preferred_visit_date: '',
    preferred_time: '',
    symptoms_summary: '',
    follow_up_needed: false,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_provider: ''
  });

  const isAuthenticated = Boolean(user);
  const isPatient = user?.role === 'PATIENT';
  const isDoctor = ['OPHTHALMOLOGIST', 'OPTOMETRIST'].includes(user?.role);
  const isReceptionist = user?.role === 'RECEPTIONIST';
  const isPharmacist = user?.role === 'PHARMACIST';

  const updateBrowserHistory = (section) => {
    if (typeof window === 'undefined') return;
    const nextHash = section && section !== 'home' ? `#${section}` : '';
    window.history.pushState({ section }, '', `${window.location.pathname}${nextHash}`);
    setHistoryEntries((prev) => [...prev, section]);
  };

  useEffect(() => {
    const handlePopState = () => {
      const hashSection = window.location.hash.replace('#', '');
      const safeSection = ['home', 'about', 'services', 'contact', 'dashboard'].includes(hashSection) ? hashSection : 'home';
      setLandingSection(safeSection);
      if (safeSection === 'dashboard') {
        setPatientView('dashboard');
      }
      setHistoryEntries((prev) => (prev[prev.length - 1] === safeSection ? prev : [...prev, safeSection]));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (user.role === 'PATIENT') {
      setLandingSection('home');
      return;
    }

    setLandingSection('dashboard');
    setPatientView('dashboard');
  }, [isAuthenticated, user?.role]);

  const getStaffDashboardView = (role) => {
    if (role === 'RECEPTIONIST') return 'receptionist';
    if (role === 'PHARMACIST') return 'pharmacist';
    if (['OPHTHALMOLOGIST', 'OPTOMETRIST'].includes(role)) return 'doctor';
    return null;
  };

  const handleLandingNavigation = (section) => {
    if (section === 'dashboard' && !isAuthenticated) {
      alert('Please log in to view the dashboard.');
      setLandingSection('home');
      return;
    }

    if ((section === 'inpatient' || section === 'outpatient') && !isAuthenticated) {
      setShowAuthPage(true);
      setAuthMode('register');
      setLandingSection('home');
      return;
    }

    setLandingSection(section);
    if (section !== landingSection) {
      updateBrowserHistory(section);
    }

    // whenever dashboard is opened, show main patient dashboard first
    if (section === 'dashboard') {
      setPatientView('dashboard');
    }

    if (section === 'inpatient' || section === 'outpatient') {
      setTreatmentSection(section);
    }
  };

  const handleGetStarted = () => {
    setShowAuthPage(true);
    setAuthMode('register');
    setLandingSection('home');
  };

  const handleTreatmentSubmit = (e) => {
    e.preventDefault();
    const label = treatmentSection === 'inpatient' ? 'Inpatient' : 'Outpatient';
    api.updateProfile({
      phone_number: phoneNumber,
      date_of_birth: dateOfBirth || null,
      gender,
      address,
      patient_profile: {
        insurance_provider: treatmentSection === 'inpatient' ? inpatientForm.insurance_provider : outpatientForm.insurance_provider,
        insurance_policy_number: insurancePolicyNumber,
        emergency_contact_name: treatmentSection === 'inpatient' ? inpatientForm.emergency_contact_name : outpatientForm.emergency_contact_name,
        emergency_contact_phone: treatmentSection === 'inpatient' ? inpatientForm.emergency_contact_phone : outpatientForm.emergency_contact_phone
      }
    }).then(() => {
      alert(`${label} treatment registration saved. Our team will follow up shortly.`);
      setLandingSection('home');
    }).catch((err) => {
      alert('Treatment registration failed: ' + err.message);
    });
  };

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const u = await api.getProfile();
      setUser(u);
    } catch (err) {
      console.error(err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.login(username, password);
      setToken(data.token);
      setUsername('');
      setPassword('');
    } catch (err) {
      alert('Login Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.register({
        username,
        password,
        email,
        first_name: firstName,
        last_name: lastName
      });
      alert('Registration successful! Please login.');
      setAuthMode('login');
      setPassword('');
    } catch (err) {
      alert('Registration Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setPatientView('dashboard');
    setShowAuthPage(false);
    setAuthMode('register');
    setTreatmentSection('');
    setLandingSection('home');
  };

  if (showAuthPage && !isAuthenticated) {
    return (
      <div className="glass-container" style={{ minHeight: '100vh' }}>
        <header className="top-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'var(--primary)', padding: '12px', borderRadius: '16px' }}>
              <Eye size={28} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.7rem' }}>EyeCare Patient Portal</h1>
            </div>
          </div>
          <button className="nav-link" onClick={() => setShowAuthPage(false)}>
            Back Home
          </button>
        </header>

        <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', padding: '32px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>
              {authMode === 'register' ? 'Create your account' : 'Login to continue'}
            </h2>
            <p style={{ textAlign: 'center', marginBottom: '24px', lineHeight: '1.7' }}>
              Use this page to access your patient account. Treatment details are collected after you log in.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
              <button
                type="button"
                className={`auth-toggle-button ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-toggle-button ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
            </div>

            {authMode === 'register' ? (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="First Name" className="glass-input" style={{ flex: 1, minWidth: '140px' }} value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  <input type="text" placeholder="Last Name" className="glass-input" style={{ flex: 1, minWidth: '140px' }} value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
                <input type="text" placeholder="Username" className="glass-input" value={username} onChange={e => setUsername(e.target.value)} required />
                <input type="email" placeholder="Email Address" className="glass-input" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit" className="glass-btn" style={{ marginTop: '4px' }}>
                  <UserPlus size={18} /> Create Account
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="text" placeholder="Username" className="glass-input" value={username} onChange={e => setUsername(e.target.value)} required />
                <input type="password" placeholder="Password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit" className="glass-btn" style={{ marginTop: '4px' }}>
                  <LogIn size={18} /> Enter Portal
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (loading && !user) {
    return (
      <div className="glass-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Loading Eyecare Platform...</h2>
          <div
            className="spinner"
            style={{
              margin: '20px auto',
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255,255,255,0.1)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          ></div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !isPatient) {
    const staffDashboardView = getStaffDashboardView(user.role);
    return (
      <div className="glass-container" style={{ minHeight: '100vh' }}>
        {staffDashboardView === 'doctor' ? (
          <DoctorDashboard user={user} onLogout={handleLogout} />
        ) : staffDashboardView === 'receptionist' ? (
          <ReceptionistDashboard user={user} onLogout={handleLogout} />
        ) : staffDashboardView === 'pharmacist' ? (
          <PharmacistDashboard user={user} onLogout={handleLogout} />
        ) : (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3>Dashboard access for your account type is still under review.</h3>
            <p>Please use your role-specific workspace for clinical and administrative tasks.</p>
          </div>
        )}
      </div>
    );
  }

  // PATIENT DASHBOARD PAGE
  if (landingSection === 'dashboard' && isAuthenticated && isPatient) {
    return (
      <div className="glass-container patient-portal-page">
        <header className="top-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'var(--primary)', padding: '12px', borderRadius: '16px' }}>
              <Eye size={28} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.7rem' }}>EyeCare Hospital</h1>
            </div>
          </div>

          <nav className="nav-links">
            <button className="nav-link" onClick={() => setLandingSection('home')}>
              Home
            </button>
            <button className="nav-link" onClick={() => setLandingSection('services')}>
              Services
            </button>
            <button className="nav-link" onClick={() => setLandingSection('contact')}>
              Contact
            </button>
            <button className="nav-link" onClick={() => setLandingSection('about')}>
              About
            </button>
            <button
              className="nav-link active"
              onClick={() => {
                setLandingSection('dashboard');
                setPatientView('dashboard');
              }}
            >
              Dashboard
            </button>
            <button className="nav-link" style={{ borderRadius: '12px' }} onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </header>

        {patientView === 'dashboard' ? (
          <PatientDashboard
            user={user}
            onLogout={handleLogout}
            onOpenShop={() => setPatientView('shop')}
          />
        ) : (
          <div style={{ width: '100%' }}>
            <div style={{ marginBottom: '16px' }}>
              <button
                className="glass-btn glass-btn-secondary"
                onClick={() => setPatientView('dashboard')}
              >
                ← Back to Dashboard
              </button>
            </div>

            <Shop user={user} />
          </div>
        )}

        <footer className="footer">
          © {new Date().getFullYear()} EyeCare. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="glass-container" style={{ minHeight: '100vh' }}>
      <header className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'var(--primary)', padding: '12px', borderRadius: '16px' }}>
            <Eye size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.7rem' }}>EyeCare Hospital</h1>
          </div>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-link ${landingSection === 'home' ? 'active' : ''}`}
            onClick={() => handleLandingNavigation('home')}
          >
            Home
          </button>
          <button
            className={`nav-link ${landingSection === 'services' ? 'active' : ''}`}
            onClick={() => handleLandingNavigation('services')}
          >
            Services
          </button>
          <button
            className={`nav-link ${landingSection === 'contact' ? 'active' : ''}`}
            onClick={() => handleLandingNavigation('contact')}
          >
            Contact
          </button>
          <button
            className={`nav-link ${landingSection === 'about' ? 'active' : ''}`}
            onClick={() => handleLandingNavigation('about')}
          >
            About
          </button>
          <button
            className={`nav-link ${landingSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleLandingNavigation('dashboard')}
            disabled={!isAuthenticated}
            style={!isAuthenticated ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            title={!isAuthenticated ? 'Log in to access the dashboard' : 'Open dashboard'}
          >
            Dashboard
          </button>
          {isAuthenticated && (
            <button className="nav-link" style={{ borderRadius: '12px' }} onClick={handleLogout}>
              Logout
            </button>
          )}
        </nav>
      </header>

      <main
        className="main-grid"
        style={['about', 'inpatient', 'outpatient'].includes(landingSection) ? { gridTemplateColumns: '1fr', maxWidth: '920px' } : undefined}
      >
        <section className="hero-panel">
          {landingSection === 'home' && (
            <>
              <div className="glass-card" style={{ padding: '30px' }}>
                <h2 style={{ textAlign: 'center' }}>{isAuthenticated ? 'Your Vision Our Priority' : 'Welcome to EyeCare'}</h2>
                <p style={{ marginTop: '14px', lineHeight: '1.8', textAlign: 'center' }}>
                  {isAuthenticated
                    ? 'You can use the Dashboard link to manage appointments, prescriptions, billing, tests, and your profile.'
                    : 'Your vision matters, and our patient-first platform puts comfort, clarity, and fast access to care at the center of every visit.'}
                </p>
                <p style={{ marginTop: '12px', lineHeight: '1.8', textAlign: 'center' }}>
                  {isAuthenticated
                    ? 'The Dashboard contains appointments, records, shopping, invoices, and simple vision tests.'
                    : 'Book appointments, view your records, order medicines or glasses, manage bills, and take simple vision checks all from one trusted dashboard.'}
                </p>

                {!isAuthenticated && (
                  <div className="cta-grid" style={{ marginTop: '22px' }}>
                    <button type="button" className="glass-btn" onClick={handleGetStarted} style={{ width: 'auto', minWidth: '132px', padding: '8px 14px', justifyContent: 'center' }}>
                      <UserPlus size={16} /> Get Started
                    </button>
                  </div>
                )}

                {isAuthenticated && landingSection === 'home' && (
                  <div className="cta-grid" style={{ marginTop: '22px' }}>
                    <button type="button" className="glass-btn" onClick={() => handleLandingNavigation('inpatient')}>
                      Inpatient Treatment
                    </button>
                    <button type="button" className="glass-btn glass-btn-secondary" onClick={() => handleLandingNavigation('outpatient')}>
                      Outpatient Treatment
                    </button>
                  </div>
                )}
              </div>

              <div className="feature-list">
                <div className="feature-card">
                  <h3>Appointments</h3>
                  <p>Schedule video or physical consultations and view your booking history.</p>
                </div>
                <div className="feature-card">
                  <h3>Health Records</h3>
                  <p>Access previous visits, triage results, and test summaries in one place.</p>
                </div>
                <div className="feature-card">
                  <h3>Shop</h3>
                  <p>Browse medicines and glasses, manage your cart, and place orders online.</p>
                </div>
              </div>
            </>
          )}

          {landingSection === 'services' && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div className="glass-card" style={{ padding: '30px', width: '100%', maxWidth: '760px' }}>
                <h2 style={{ textAlign: 'center' }}>Our Services</h2>
                <p style={{ marginTop: '14px', lineHeight: '1.8', textAlign: 'center' }}>
                  EyeCare offers complete vision support for every stage of your journey, from routine checks to advanced treatment planning.
                </p>
                <div style={{ display: 'grid', gap: '14px', marginTop: '20px' }}>
                  <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
                    <h3 style={{ marginBottom: '6px' }}>Comprehensive Eye Exams</h3>
                    <p style={{ lineHeight: '1.7', margin: 0 }}>Book consultations, receive detailed assessments, and keep track of your progress in one secure portal.</p>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
                    <h3 style={{ marginBottom: '6px' }}>Treatment Planning</h3>
                    <p style={{ lineHeight: '1.7', margin: 0 }}>Access inpatient and outpatient support options with a streamlined registration experience.</p>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
                    <h3 style={{ marginBottom: '6px' }}>Pharmacy & Optical Shop</h3>
                    <p style={{ lineHeight: '1.7', margin: 0 }}>Order prescriptions, eyewear, and care essentials directly from your patient dashboard.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {landingSection === 'contact' && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div className="glass-card" style={{ padding: '30px', width: '100%', maxWidth: '760px' }}>
                <h2 style={{ textAlign: 'center' }}>Contact EyeCare</h2>
                <p style={{ marginTop: '14px', lineHeight: '1.8', textAlign: 'center' }}>
                  We are here to help with appointments, support requests, and general enquiries about your care.
                </p>
                <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }}>
                    <strong>Phone:</strong> +233 24 000 0000
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }}>
                    <strong>Email:</strong> support@eyecarehospital.com
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }}>
                    <strong>Address:</strong> 12 Vision Avenue, Accra, Ghana
                  </div>
                </div>
              </div>
            </div>
          )}

          {landingSection === 'about' && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div className="glass-card" style={{ padding: '30px', width: '100%', maxWidth: '760px' }}>
                <h2 style={{ textAlign: 'center' }}>About EyeCare</h2>
                <p style={{ marginTop: '14px', lineHeight: '1.8', textAlign: 'center' }}>
                  EyeCare is built to support every patient along their eye health journey. From comfortable consultation booking to prescription management and billing transparency, we bring modern care into one place.
                </p>
                <p style={{ marginTop: '12px', lineHeight: '1.8', textAlign: 'center' }}>
                  Our patient dashboard gives you fast access to appointments, medical records, bills, vision tests, and a shop with medicines and eyewear.
                </p>
                <p style={{ marginTop: '12px', lineHeight: '1.8', textAlign: 'center' }}>
                  Start with registration, then choose inpatient or outpatient support once your account is active.
                </p>
                {isAuthenticated && (
                  <div className="cta-grid" style={{ marginTop: '22px' }}>
                    <button type="button" className="glass-btn" onClick={() => handleLandingNavigation('inpatient')}>
                      Inpatient Treatment
                    </button>
                    <button type="button" className="glass-btn glass-btn-secondary" onClick={() => handleLandingNavigation('outpatient')}>
                      Outpatient Treatment
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {landingSection === 'inpatient' && isAuthenticated && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div className="glass-card" style={{ padding: '30px', width: '100%', maxWidth: '760px' }}>
                <button type="button" className="glass-btn glass-btn-secondary" onClick={() => setLandingSection('home')} style={{ width: 'auto', marginBottom: '18px' }}>
                  ← Back to Home
                </button>
                <h2>Inpatient Treatment Request</h2>
                <p style={{ marginTop: '12px', lineHeight: '1.8' }}>
                  Use this form for admission and ward-based care planning.
                </p>
                <form onSubmit={handleTreatmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input type="tel" placeholder="Phone Number" className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required />
                    <input type="date" className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <select className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={gender} onChange={e => setGender(e.target.value)} required>
                      <option value="">Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input type="text" placeholder="Insurance Provider" className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={inpatientForm.insurance_provider} onChange={e => setInpatientForm(prev => ({ ...prev, insurance_provider: e.target.value }))} required />
                  </div>
                  <input type="text" placeholder="Insurance Policy Number" className="glass-input" value={insurancePolicyNumber} onChange={e => setInsurancePolicyNumber(e.target.value)} required />
                  <textarea placeholder="Residential Address" className="glass-input" style={{ minHeight: '90px' }} value={address} onChange={e => setAddress(e.target.value)} required />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="Emergency Contact Name" className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={inpatientForm.emergency_contact_name} onChange={e => setInpatientForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))} required />
                    <input type="tel" placeholder="Emergency Contact Phone" className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={inpatientForm.emergency_contact_phone} onChange={e => setInpatientForm(prev => ({ ...prev, emergency_contact_phone: e.target.value }))} required />
                  </div>
                  <textarea
                    placeholder="Reason for admission"
                    className="glass-input"
                    style={{ minHeight: '90px' }}
                    value={inpatientForm.reason_for_admission}
                    onChange={e => setInpatientForm(prev => ({ ...prev, reason_for_admission: e.target.value }))}
                    required
                  />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="date"
                      className="glass-input"
                      style={{ flex: 1, minWidth: '180px' }}
                      value={inpatientForm.admission_date}
                      onChange={e => setInpatientForm(prev => ({ ...prev, admission_date: e.target.value }))}
                      required
                    />
                    <input
                      type="time"
                      className="glass-input"
                      style={{ flex: 1, minWidth: '180px' }}
                      value={inpatientForm.preferred_treatment_time}
                      onChange={e => setInpatientForm(prev => ({ ...prev, preferred_treatment_time: e.target.value }))}
                    />
                    <input
                      type="text"
                      placeholder="Preferred treatment date"
                      className="glass-input"
                      style={{ flex: 1, minWidth: '180px' }}
                      value={inpatientForm.preferred_treatment_date}
                      onChange={e => setInpatientForm(prev => ({ ...prev, preferred_treatment_date: e.target.value }))}
                    />
                  </div>
                  <textarea placeholder="Symptoms summary" className="glass-input" style={{ minHeight: '90px' }} value={inpatientForm.symptoms_summary} onChange={e => setInpatientForm(prev => ({ ...prev, symptoms_summary: e.target.value }))} />
                  <button type="submit" className="glass-btn" style={{ marginTop: '4px', width: 'fit-content' }}>
                    Save Inpatient Registration
                  </button>
                </form>
              </div>
            </div>
          )}

          {landingSection === 'outpatient' && isAuthenticated && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div className="glass-card" style={{ padding: '30px', width: '100%', maxWidth: '760px' }}>
                <button type="button" className="glass-btn glass-btn-secondary" onClick={() => setLandingSection('home')} style={{ width: 'auto', marginBottom: '18px' }}>
                  ← Back to Home
                </button>
                <h2>Outpatient Treatment Request</h2>
                <p style={{ marginTop: '12px', lineHeight: '1.8' }}>
                  Use this form for consultation and follow-up visit planning.
                </p>
                <form onSubmit={handleTreatmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input type="tel" placeholder="Phone Number" className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required />
                    <input type="date" className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <select className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={gender} onChange={e => setGender(e.target.value)} required>
                      <option value="">Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input type="text" placeholder="Insurance Provider" className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={outpatientForm.insurance_provider} onChange={e => setOutpatientForm(prev => ({ ...prev, insurance_provider: e.target.value }))} required />
                  </div>
                  <input type="text" placeholder="Insurance Policy Number" className="glass-input" value={insurancePolicyNumber} onChange={e => setInsurancePolicyNumber(e.target.value)} required />
                  <textarea placeholder="Residential Address" className="glass-input" style={{ minHeight: '90px' }} value={address} onChange={e => setAddress(e.target.value)} required />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="Emergency Contact Name" className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={outpatientForm.emergency_contact_name} onChange={e => setOutpatientForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))} required />
                    <input type="tel" placeholder="Emergency Contact Phone" className="glass-input" style={{ flex: 1, minWidth: '180px' }} value={outpatientForm.emergency_contact_phone} onChange={e => setOutpatientForm(prev => ({ ...prev, emergency_contact_phone: e.target.value }))} required />
                  </div>
                  <textarea
                    placeholder="Reason for visit"
                    className="glass-input"
                    style={{ minHeight: '90px' }}
                    value={outpatientForm.visit_reason}
                    onChange={e => setOutpatientForm(prev => ({ ...prev, visit_reason: e.target.value }))}
                    required
                  />
                  <textarea
                    placeholder="Symptoms summary"
                    className="glass-input"
                    style={{ minHeight: '90px' }}
                    value={outpatientForm.symptoms_summary}
                    onChange={e => setOutpatientForm(prev => ({ ...prev, symptoms_summary: e.target.value }))}
                  />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="date"
                      className="glass-input"
                      style={{ flex: 1, minWidth: '180px' }}
                      value={outpatientForm.preferred_visit_date}
                      onChange={e => setOutpatientForm(prev => ({ ...prev, preferred_visit_date: e.target.value }))}
                      required
                    />
                    <input
                      type="time"
                      className="glass-input"
                      style={{ flex: 1, minWidth: '180px' }}
                      value={outpatientForm.preferred_time}
                      onChange={e => setOutpatientForm(prev => ({ ...prev, preferred_time: e.target.value }))}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={outpatientForm.follow_up_needed}
                      onChange={e => setOutpatientForm(prev => ({ ...prev, follow_up_needed: e.target.checked }))}
                    />
                    Follow-up appointment needed
                  </label>
                  <button type="submit" className="glass-btn" style={{ marginTop: '4px', width: 'fit-content' }}>
                    Save Outpatient Registration
                  </button>
                </form>
              </div>
            </div>
          )}

          {landingSection === 'dashboard' && isAuthenticated && user.role !== 'PATIENT' && (
            <div className="glass-card" style={{ padding: '24px', marginTop: '20px' }}>
              <h3>Dashboard access for your account type is still under review.</h3>
              <p>Please use your role-specific workspace for clinical and administrative tasks.</p>
            </div>
          )}
        </section>

        {landingSection === 'home' && (
          <aside style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <img
              src={heroImage}
              alt="EyeCare visual illustration"
              style={{ width: '100%', maxWidth: '420px', height: 'auto', display: 'block', objectFit: 'contain', background: 'transparent' }}
            />
          </aside>
        )}

      </main>

      <footer className="footer">
        © {new Date().getFullYear()} EyeCare. All rights reserved.
      </footer>
    </div>
  );
}

export default App;