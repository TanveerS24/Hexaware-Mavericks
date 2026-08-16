import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

const QUICK_ACTIONS = [
  "Track my complaint status",
  "Report a water leak",
  "Report a power outage",
  "What is my credibility score?"
];

const AIChatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Copilot. I can answer questions about the status of your complaints, help you file new ones, or explain municipal services. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendQuery = async (queryText) => {
    if (!queryText.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: queryText }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await api.post('/chatbot', 
        { message: queryText },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.reply,
        can_auto_file: response.data.can_auto_file,
        extracted_issue_draft: response.data.extracted_issue_draft
      }]);
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    const query = input.trim();
    setInput('');
    sendQuery(query);
  };

  const handleFileComplaint = async (draft) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('transcript', draft.transcript || "Complaint filed via chatbot");
      if (draft.category) formData.append('category', draft.category);
      if (draft.priority) formData.append('priority', draft.priority);
      if (draft.summary) formData.append('ai_summary', draft.summary);
      
      const token = localStorage.getItem('access_token');
      const response = await api.post('/issues', formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `✅ Successfully filed! Your Complaint ID is **${response.data.issue_id}**. You can track its status in the 'My Complaints' section.`
      }]);
    } catch (err) {
      console.error("Failed to auto-file:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Sorry, I failed to file the complaint. Please use the Report page.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-container" style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.25rem', background: 'linear-gradient(135deg, var(--primary-blue), #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AI Copilot
        </h2>
        <p className="text-secondary" style={{ margin: 0 }}>Intelligent Municipal Assistant</p>
      </div>
      
      <div className="card" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        padding: 0,
        overflow: 'hidden',
        background: 'var(--surface)'
      }}>
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {messages.length === 1 && (
            <div className="quick-actions">
              {QUICK_ACTIONS.map((action, idx) => (
                <button 
                  key={idx} 
                  className="action-chip"
                  onClick={() => sendQuery(action)}
                  disabled={loading}
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className="chat-message" style={{ flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div className={`chat-avatar ${msg.role}`}>
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className={`chat-bubble ${msg.role}`}>
                {msg.content}
                
                {msg.can_auto_file && msg.extracted_issue_draft && (
                  <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', margin: 0 }}><strong>Category:</strong> {msg.extracted_issue_draft.category}</p>
                      <p style={{ fontSize: '0.9rem', margin: 0, marginTop: '0.5rem' }}><strong>Summary:</strong> {msg.extracted_issue_draft.summary}</p>
                    </div>
                    <button 
                      onClick={() => handleFileComplaint(msg.extracted_issue_draft)}
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(135deg, var(--success), #059669)',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        width: '100%',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'none'}
                    >
                      🚀 Submit Official Grievance
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
             <div className="chat-message">
              <div className="chat-avatar ai">🤖</div>
              <div className="chat-bubble ai" style={{ padding: '1rem 1.5rem', width: 'auto' }}>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', height: '1.5rem' }}>
                  <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block', width: '8px', height: '8px', background: 'var(--primary-blue)', borderRadius: '50%' }}></span>
                  <span style={{ animation: 'pulse 1.5s infinite 0.2s', display: 'inline-block', width: '8px', height: '8px', background: 'var(--primary-blue)', borderRadius: '50%' }}></span>
                  <span style={{ animation: 'pulse 1.5s infinite 0.4s', display: 'inline-block', width: '8px', height: '8px', background: 'var(--primary-blue)', borderRadius: '50%' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
          <form onSubmit={handleSend} className="chat-input-wrapper">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI Copilot..." 
              className="form-control"
              disabled={loading}
              style={{ width: '100%', margin: 0 }}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="send-button"
            >
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
