import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

// Minimal Telemedicine placeholder component
export default function Telemedicine() {
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  const qs = new URLSearchParams(useLocation().search);
  const token = qs.get('token');

  useEffect(() => {
    if (!token) {
      // token missing — navigate back
      setTimeout(() => navigate(-1), 1800);
      return;
    }
    // Here we'd initialize the real WebRTC/SDK with the token.
    // For now, display a placeholder and simulate initialization.
    console.log('Initialize telemedicine with token', token, 'for appointment', appointmentId);
  }, [token, appointmentId, navigate]);

  if (!token) return (
    <div style={{ padding: 24 }} className="glass-card">
      <h3>Missing telemedicine token</h3>
      <p>Returning to previous screen…</p>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <div className="glass-card" style={{ padding: 20 }}>
        <h2>Telemedicine Session</h2>
        <p>Appointment: {appointmentId}</p>
        <p style={{ marginTop: 12 }}>Token: <code style={{ background: '#f3f9ff', padding: '4px 8px', borderRadius: 6 }}>{token}</code></p>
        <div style={{ marginTop: 20 }}>
          <p>This page should initialize a video session using your telemedicine provider SDK (Jitsi/Mediasoup/Custom).
             The `api.getRoomToken` endpoint provides the token or `room_url` required to join the call.</p>
          <p>Implement SDK initialization here and handle microphone/camera permissions.</p>
        </div>
      </div>
    </div>
  );
}
