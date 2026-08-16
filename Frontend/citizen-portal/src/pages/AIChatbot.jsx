import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

const AIChatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Copilot. I can answer questions about the status of your complaints or municipal services. How can I help you today?' }
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await api.post('/chatbot', 
        { message: userMessage },
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
    <div className="chatbot-page" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ marginBottom: '1rem' }}>AI Copilot Chatbot</h2>
      
      <div className="card" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        padding: 0,
        overflow: 'hidden'
      }}>
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ 
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '75%'
            }}>
              <div style={{
                background: msg.role === 'user' ? 'var(--primary-blue)' : 'var(--background)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                padding: '1rem',
                borderRadius: 'var(--radius)',
                borderBottomRightRadius: msg.role === 'user' ? 0 : 'var(--radius)',
                borderBottomLeftRadius: msg.role === 'assistant' ? 0 : 'var(--radius)',
                boxShadow: 'var(--shadow-sm)',
                lineHeight: '1.5'
              }}>
                {msg.content}
                
                {msg.can_auto_file && msg.extracted_issue_draft && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}><strong>Draft Category:</strong> {msg.extracted_issue_draft.category}</p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}><strong>Draft Summary:</strong> {msg.extracted_issue_draft.summary}</p>
                    <button 
                      onClick={() => handleFileComplaint(msg.extracted_issue_draft)}
                      disabled={loading}
                      style={{
                        background: 'var(--success)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      🚀 File this Complaint
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start' }}>
              <div style={{
                background: 'var(--background)',
                color: 'var(--text-secondary)',
                padding: '1rem',
                borderRadius: 'var(--radius)',
                borderBottomLeftRadius: 0,
                boxShadow: 'var(--shadow-sm)'
              }}>
                <em>Typing...</em>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about your complaints..." 
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '1rem'
              }}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              style={{
                background: (loading || !input.trim()) ? 'var(--border)' : 'var(--primary-blue)',
                color: (loading || !input.trim()) ? 'var(--text-secondary)' : 'white',
                border: 'none',
                padding: '0 1.5rem',
                borderRadius: 'var(--radius)',
                cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
