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
    <div style={{ padding: '2rem' }}>
      <h2>AI Voice Call Agent</h2>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#e6f0fa', borderRadius: '8px' }}>
        <strong>Agent Says:</strong>
        <p>{agentSpeech || 'Click Start Call to begin'}</p>
      </div>

      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f4f7f6', borderRadius: '8px' }}>
        <strong>You Said:</strong>
        <p>{transcript}</p>
      </div>

      {agentState === 'IDLE' && (
        <button onClick={startAgent} style={{ padding: '10px 20px', background: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Start Call
        </button>
      )}

      {agentState === 'AWAITING_SELECTION' && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Select a complaint (Touch or Voice):</h3>
          {complaints.map((c, idx) => (
            <button 
              key={c.id} 
              onClick={() => handleSelectComplaint(idx)}
              style={{ display: 'block', margin: '10px 0', padding: '10px', width: '100%' }}
            >
              [ {idx + 1} ] {c.category}
            </button>
          ))}
          <button 
            onClick={handleNewProblemInitiated}
            style={{ display: 'block', margin: '10px 0', padding: '10px', width: '100%', background: '#28a745', color: 'white' }}
          >
            I want to report a new problem
          </button>
        </div>
      )}
    </div>
  );
};

export default CallAgent;
