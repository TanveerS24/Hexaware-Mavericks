import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  
  // Audio state
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [time, setTime] = useState(0);
  
  // Process State
  const [step, setStep] = useState(1); // 1: Input, 2: Transcribe/Edit, 3: Location, 4: Result
  const [processing, setProcessing] = useState(false);
  
  // Complaint State
  const [transcript, setTranscript] = useState('');
  const [location, setLocation] = useState({ area: '', city: '', state: '', postal_code: '', latitude: '', longitude: '' });
  const [useRegisteredLocation, setUseRegisteredLocation] = useState(false);
  
  // Result
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.get('/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mp3' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setTime(0);
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } catch (err) {
      setError('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const processAudio = async () => {
    if (!audioBlob) return;
    setProcessing(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'complaint.mp3');
      
      const token = localStorage.getItem('access_token');
      const response = await api.post('/issues/transcribe', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      setTranscript(response.data.transcript);
      setStep(2);
    } catch (err) {
      setError('Failed to transcribe audio.');
    } finally {
      setProcessing(false);
    }
  };

  const submitComplaint = async () => {
    setProcessing(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('transcript', transcript);
      
      const locData = useRegisteredLocation && user ? {
        ward: user.area,
        location_lat: user.latitude,
        location_lng: user.longitude
      } : {
        ward: location.area,
        location_lat: location.latitude ? parseFloat(location.latitude) : undefined,
        location_lng: location.longitude ? parseFloat(location.longitude) : undefined
      };

      if (locData.ward) formData.append('ward', locData.ward);
      if (locData.location_lat) formData.append('location_lat', locData.location_lat);
      if (locData.location_lng) formData.append('location_lng', locData.location_lng);
      
      if (audioBlob) {
        formData.append('audio_file', audioBlob, 'complaint.mp3');
      }

      const token = localStorage.getItem('access_token');
      const response = await api.post('/issues', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      setResult(response.data);
      setStep(4);
    } catch (err) {
      setError('Failed to submit complaint.');
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="mb-4">
        <h2>Welcome, {user?.name || 'Citizen'}</h2>
        <p className="text-secondary">Report a problem in your area easily using voice or text.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {step === 1 && (
        <div className="card text-center">
          <h3>🎙️ Report a Problem</h3>
          <p className="mb-4">Record or upload your complaint.</p>
          
          <div style={{ marginBottom: '2rem' }}>
            {!recording ? (
              <button className="mic-btn" onClick={startRecording} title="Start Recording">🎤</button>
            ) : (
              <div className="text-center">
                <button className="mic-btn recording" onClick={stopRecording} title="Stop Recording">⏹️</button>
                <div className="mt-2 text-danger">🔴 Recording... {formatTime(time)}</div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} style={{display: 'none'}} />
            <button className="btn" onClick={() => fileInputRef.current.click()} style={{border: '1px solid var(--border)'}}>
              📁 Upload Audio File
            </button>
          </div>

          {audioUrl && (
            <div className="mt-4 p-3" style={{ background: 'var(--primary-light)', borderRadius: 'var(--radius)' }}>
              <h5>Audio Ready</h5>
              <audio src={audioUrl} controls className="mb-3" style={{width: '100%'}} />
              <button className="btn btn-primary" onClick={processAudio} disabled={processing} style={{width: '100%'}}>
                {processing ? 'Processing Audio...' : 'Next Step'}
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3>Your Transcription</h3>
          <p className="text-secondary">Please review and edit if necessary.</p>
          
          <div className="form-group mt-3">
            <textarea 
              className="form-control" 
              rows="6" 
              value={transcript} 
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>
          
          <div className="grid grid-2 mt-4">
            <button className="btn" onClick={() => setStep(1)} style={{border: '1px solid var(--border)'}}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Confirm & Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h3>Where is the problem?</h3>
          
          <div className="form-group mt-3">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={useRegisteredLocation} 
                onChange={(e) => setUseRegisteredLocation(e.target.checked)} 
              />
              Use my registered location
            </label>
          </div>

          {!useRegisteredLocation && (
            <div className="mt-3">
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Area</label>
                  <input type="text" className="form-control" value={location.area} onChange={e => setLocation({...location, area: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" className="form-control" value={location.city} onChange={e => setLocation({...location, city: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 mb-4" style={{ background: 'var(--background)', borderRadius: 'var(--radius)' }}>
            <h5>Review Complaint</h5>
            <p><strong>Complaint:</strong> {transcript}</p>
          </div>

          <div className="grid grid-2 mt-4">
            <button className="btn" onClick={() => setStep(2)} style={{border: '1px solid var(--border)'}}>Back</button>
            <button className="btn btn-primary" onClick={submitComplaint} disabled={processing}>
              {processing ? 'Analyzing & Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && result && (
        <div className="card text-center" style={{ borderTop: '4px solid var(--success)' }}>
          <h2 style={{color: 'var(--success)'}}>✓ Complaint Submitted</h2>
          <p className="mt-3 text-secondary">Your grievance has been classified and forwarded to the respective department.</p>
          
          <div className="mt-4 text-left" style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)', textAlign: 'left' }}>
            <p><strong>Complaint ID:</strong> {result.issue_id}</p>
            <p><strong>Assigned Department:</strong> {result.department_name || 'Pending'}</p>
            <p><strong>Status:</strong> {result.status}</p>
            <p><strong>Your Problem:</strong> {transcript}</p>
          </div>

          <button className="btn btn-primary mt-4" onClick={() => {
            setStep(1);
            setAudioBlob(null);
            setAudioUrl('');
            setTranscript('');
          }}>Report Another Problem</button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
