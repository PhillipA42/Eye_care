import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, FileText, Check, AlertCircle } from 'lucide-react';

export default function ReceptionistDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('queue');
  
  // Queue/Check-in state
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [selectedApptId, setSelectedApptId] = useState('');
  const [queuePriority, setQueuePriority] = useState('NORMAL');
  const [queueNotes, setQueueNotes] = useState('');

  // Claims state
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'queue') {
        const appts = await api.getBookings();
        // filter appointments that aren't already checked in
        setAppointments(appts.filter(a => a.status === 'SCHEDULED'));
        
        const queueData = await api.getQueue();
        setQueue(queueData);
      } else if (activeTab === 'claims') {
        const res = await api.getClaims();
        setClaims(res);
      }
    } catch (err) {
      alert('Error fetching data: ' + err.message);
    }
  };

  // Submit patient check-in
  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedApptId) {
      alert('Please select an appointment to check in.');
      return;
    }
    try {
      await api.createQueueEntry({
        appointment: parseInt(selectedApptId),
        priority: queuePriority,
        notes: queueNotes
      });
      alert('Patient checked in and added to queue.');
      setSelectedApptId('');
      setQueueNotes('');
      setQueuePriority('NORMAL');
      fetchData();
    } catch(err) {
      alert(err.message);
    }
  };

  const handleClaimAction = async (id, status, amount) => {
    try {
      await api.approveClaim(id, {
        status: status,
        amount_approved: parseFloat(amount)
      });
      alert(`Claim successfully ${status.toLowerCase()}!`);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="glass-container" style={{ padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Front Desk Workspace (Receptionist)</h2>
        </div>
        <button className="glass-btn glass-btn-secondary" onClick={onLogout}>Logout</button>
      </header>

      {/* Tabs */}
      <div className="glass-card" style={{ display: 'flex', gap: '8px', padding: '8px', marginBottom: '24px' }}>
        <button className={`glass-btn ${activeTab === 'queue' ? '' : 'glass-btn-secondary'}`} onClick={() => setActiveTab('queue')}>
          <Users size={18} /> Patient Check-In & Queue
        </button>
        <button className={`glass-btn ${activeTab === 'claims' ? '' : 'glass-btn-secondary'}`} onClick={() => setActiveTab('claims')}>
          <FileText size={18} /> Insurance Claims
        </button>
      </div>

      <div className="tab-content">
        
        {/* Queue Management */}
        {activeTab === 'queue' && (
          <div className="grid-container">
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>Patient Check-In Form</h3>
              <p style={{ marginBottom: '16px' }}>Select a scheduled appointment to check-in the patient into the live clinic queue.</p>
              
              <form onSubmit={handleCheckIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px' }}>Select Appointment</label>
                  <select className="glass-input" style={{ width: '100%' }} value={selectedApptId} onChange={e => setSelectedApptId(e.target.value)}>
                    <option value="">-- Select Scheduled Appointment --</option>
                    {appointments.map(appt => (
                      <option key={appt.id} value={appt.id}>
                        {appt.patient_details?.username} with Dr. {appt.doctor_details?.username} ({new Date(appt.slot_details?.start_time).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px' }}>Priority Level</label>
                  <select className="glass-input" style={{ width: '100%' }} value={queuePriority} onChange={e => setQueuePriority(e.target.value)}>
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent / Dilated Scan</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px' }}>Check-in Notes</label>
                  <textarea className="glass-input" style={{ width: '100%', minHeight: '80px' }} value={queueNotes} onChange={e => setQueueNotes(e.target.value)} placeholder="Triage comments, visual complaints, etc..." />
                </div>

                <button type="submit" className="glass-btn">Check In Patient</button>
              </form>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <h3>Live Clinic Queue</h3>
              <p>Active patients in the clinic waitlist, sorted by urgency.</p>
              <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {queue.length === 0 ? <p>No patients currently in the queue.</p> : (
                  queue.map(entry => (
                    <div key={entry.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{entry.patient_name}</strong>
                        <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Check-in: {new Date(entry.check_in_time).toLocaleTimeString()} | Priority: <span style={{ color: entry.priority === 'EMERGENCY' ? '#ef4444' : entry.priority === 'URGENT' ? '#f59e0b' : '#10b981' }}>{entry.priority}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.85em', color: 'var(--secondary)' }}>{entry.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Claims Management */}
        {activeTab === 'claims' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3>Insurance Claims</h3>
            <p style={{ marginBottom: '16px' }}>Review and process submitted insurance claims for billing reimbursements.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {claims.length === 0 ? <p>No claims pending review.</p> : (
                claims.map(claim => (
                  <div key={claim.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h4>Claim #{claim.id}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9em', marginTop: '8px' }}>
                        <div><strong>Provider:</strong> {claim.insurance_provider}</div>
                        <div><strong>Policy:</strong> {claim.policy_number}</div>
                        <div><strong>Amount Claimed:</strong> ${claim.amount_claimed}</div>
                        <div><strong>Status:</strong> {claim.claim_status}</div>
                      </div>
                    </div>
                    
                    {claim.claim_status === 'SUBMITTED' ? (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="glass-btn" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => {
                          const amt = prompt('Enter approved amount:', claim.amount_claimed);
                          if (amt !== null) handleClaimAction(claim.id, 'APPROVED', amt);
                        }}>
                          <Check size={14} /> Approve
                        </button>
                        <button className="glass-btn glass-btn-danger" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => handleClaimAction(claim.id, 'REJECTED', 0)}>
                          <AlertCircle size={14} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 'bold', color: claim.claim_status === 'APPROVED' ? 'var(--accent)' : 'var(--danger)' }}>
                        {claim.claim_status === 'APPROVED' ? `Approved: $${claim.amount_approved}` : 'Rejected'}
                      </span>
                    )}
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
