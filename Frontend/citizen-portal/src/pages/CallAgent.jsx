import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const CallAgent = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentState, setAgentState] = useState('IDLE'); // IDLE, GREETING, LISTING, AWAITING_SELECTION, NEW_PROBLEM, AWAITING_LOCATION, CONFIRMING, DONE
  const [transcript, setTranscript] = useState('');
  const [agentSpeech, setAgentSpeech] = useState('');
  const [newComplaintData, setNewComplaintData] = useState({ problem: '', location: '' });
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    fetchComplaints();
    initSpeechRecognition();
  }, []);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await api.get('/citizen/issues', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComplaints(res.data.items || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const initSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser does not support Speech Recognition. Please use Chrome or Edge.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      handleCitizenSpeech(text.toLowerCase());
    };
  };

  const speak = (text, onEndCallback) => {
    setAgentSpeech(text);
    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        if (onEndCallback) onEndCallback();
      };
      synthRef.current.speak(utterance);
    }
  };

  const startAgent = () => {
    setAgentState('GREETING');
    speak("Hi! Welcome to the Citizen Service Portal. How can I help you today?", () => {
      // List problems
      if (complaints.length > 0) {
        let text = `You currently have ${complaints.length} active complaints. `;
        complaints.forEach((c, idx) => {
          text += `Number ${idx + 1}: ${c.category} in ${c.ward || 'your area'}. `;
        });
        text += "Please say or select the number of the problem you want to discuss, or say 'I want to report a new problem'.";
        setAgentState('AWAITING_SELECTION');
        speak(text, () => {
          recognitionRef.current.start();
        });
      } else {
        const text = "You have no active complaints. To report a new one, please say 'I want to report a new problem'.";
        setAgentState('AWAITING_SELECTION');
        speak(text, () => {
          recognitionRef.current.start();
        });
      }
    });
  };

  const handleCitizenSpeech = (text) => {
    if (agentState === 'AWAITING_SELECTION') {
      if (text.includes('new problem') || text.includes('report a new')) {
        handleNewProblemInitiated();
      } else if (text.includes('one') || text.includes('1')) {
        handleSelectComplaint(0);
      } else if (text.includes('two') || text.includes('2')) {
        handleSelectComplaint(1);
      } else if (text.includes('three') || text.includes('3')) {
        handleSelectComplaint(2);
      }
    } else if (agentState === 'NEW_PROBLEM') {
      setNewComplaintData(prev => ({ ...prev, problem: text }));
      setAgentState('AWAITING_LOCATION');
      speak(`I understood that you are reporting a ${text}. Please tell me where the problem is located.`, () => {
        recognitionRef.current.start();
      });
    } else if (agentState === 'AWAITING_LOCATION') {
      setNewComplaintData(prev => ({ ...prev, location: text }));
      setAgentState('CONFIRMING');
      speak(`I understood the location as ${text}. Is that correct?`, () => {
        recognitionRef.current.start();
      });
    } else if (agentState === 'CONFIRMING') {
      if (text.includes('yes') || text.includes('correct')) {
        submitNewComplaint();
      } else {
        setAgentState('NEW_PROBLEM');
        speak("I apologize. Let's try again. Please tell me about the problem.", () => {
          recognitionRef.current.start();
        });
      }
    }
  };

  const handleNewProblemInitiated = () => {
    setAgentState('NEW_PROBLEM');
    speak("Sure. Please tell me about the problem.", () => {
      recognitionRef.current.start();
    });
  };

  const handleSelectComplaint = (index) => {
    if (complaints[index]) {
      const issue = complaints[index];
      speak(`You selected complaint number ${index + 1} regarding ${issue.category}. The current status is ${issue.status}. Would you like to hear more details?`);
    }
  };

  const submitNewComplaint = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('transcript', `${newComplaintData.problem} located at ${newComplaintData.location}`);
      formData.append('source', 'call_agent');
      formData.append('ward', newComplaintData.location);

      const res = await api.post('/citizen/issues', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const issueId = res.data.issue_id;
      setAgentState('DONE');
      speak(`Thank you. Your complaint has been successfully registered. Your complaint number is ${issueId}. You will receive updates soon.`);
    } catch (err) {
      console.error(err);
      speak("I'm sorry, there was an error submitting your complaint.");
    }
  };

  if (loading) return <div>Loading Call Agent...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ background: 'linear-gradient(135deg, var(--primary-blue), #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
          AI Voice Call Agent
        </h2>
        <p className="text-secondary">Simulate a voice call with our AI assistant</p>
      </div>
      
      <div className="card">
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--primary-light)', borderRadius: 'var(--radius)', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
          <strong style={{ color: 'var(--primary-dark)', display: 'block', marginBottom: '0.5rem' }}>🤖 Agent Says:</strong>
          <p style={{ margin: 0, fontSize: '1.1rem', lineHeight: '1.5' }}>{agentSpeech || 'Click Start Call to begin'}</p>
        </div>

        <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--background)', borderRadius: 'var(--radius)', border: 'var(--glass-border)' }}>
          <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>👤 You Said:</strong>
          <p style={{ margin: 0, fontSize: '1.1rem', fontStyle: transcript ? 'normal' : 'italic', color: transcript ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {transcript || 'Waiting for you to speak...'}
          </p>
        </div>

        {agentState === 'IDLE' && (
          <div className="text-center">
            <button onClick={startAgent} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.1rem', borderRadius: '999px' }}>
              📞 Start Call
            </button>
          </div>
        )}

        {agentState === 'AWAITING_SELECTION' && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Select a complaint (Touch or Voice):</h4>
            <div className="grid grid-2">
              {complaints.map((c, idx) => (
                <button 
                  key={c.id} 
                  onClick={() => handleSelectComplaint(idx)}
                  className="btn"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '1rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                  <span style={{ background: 'var(--primary-blue)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>{idx + 1}</span>
                  {c.category}
                </button>
              ))}
            </div>
            <button 
              onClick={handleNewProblemInitiated}
              className="btn btn-primary mt-3"
              style={{ width: '100%', background: 'linear-gradient(135deg, var(--success), #059669)', border: 'none' }}
            >
              + I want to report a new problem
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallAgent;
