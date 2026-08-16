import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { MessageSquare, X, Send, Sparkles, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export default function AIChatbot() {
  const { user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: `Welcome ${user?.name?.split(' ')[0] || ''}. I am the CitizenAI Intelligent Grievance Assistant. How may I assist you with department routing, SLA deadlines, or active complaint tracking today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const { response } = await api.chatbot(userMsg);
      setMessages(prev => [...prev, { role: 'bot', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Connection temporarily unavailable. Please verify network or try again shortly.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickReplies = [
    'Track my active complaint',
    'Water & Sewerage department guidelines',
    'Explain SLA resolution timelines',
    'Emergency escalation protocol'
  ];

  return (
    <>
      <button
        className="chatbot-fab"
        onClick={() => setIsOpen(!isOpen)}
        title="CitizenAI Assistant"
      >
        {isOpen ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(2, 132, 199, 0.2)', border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8'
            }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#f8fafc' }}>CitizenAI Assistant</div>
              <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                Operational • Multilingual NLP
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{
              marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8',
              cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}>
              <X size={18} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="chat-msg bot" style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '12px 16px' }}>
                <span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Analyzing inquiry...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '1px solid var(--border-subtle)' }}>
              {quickReplies.map((q, i) => (
                <button key={i} onClick={() => setInput(q)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11.5,
                  background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)',
                  color: '#94a3b8', cursor: 'pointer', transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about departments, SLAs, or grievances..."
            />
            <button onClick={sendMessage} className="btn btn-primary btn-sm" disabled={loading || !input.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
