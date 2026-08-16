import React from 'react';

const Emergency = () => {
  const emergencyContacts = [
    { number: '100', name: 'Police', color: '#0056b3' },
    { number: '101', name: 'Fire', color: '#dc3545' },
    { number: '102', name: 'Ambulance', color: '#28a745' },
    { number: '108', name: 'Emergency Disaster Management', color: '#fd7e14' },
    { number: '112', name: 'National Emergency Number', color: '#6610f2' }
  ];

  return (
    <div className="emergency-page">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ color: 'var(--error)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>Emergency Contacts</h2>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          In case of immediate danger or life-threatening situations, dial the numbers below immediately.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {emergencyContacts.map((contact, idx) => (
          <div key={idx} className="card" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '2rem', 
            marginBottom: 0,
            borderLeft: `8px solid ${contact.color}`
          }}>
            <div style={{ 
              background: `${contact.color}20`, 
              color: contact.color,
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '1.8rem',
              fontWeight: 'bold',
              marginRight: '1.5rem'
            }}>
              {contact.number}
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.4rem' }}>{contact.name}</h3>
              <a 
                href={`tel:${contact.number}`} 
                style={{ 
                  display: 'inline-block', 
                  marginTop: '0.5rem', 
                  color: contact.color, 
                  fontWeight: 'bold',
                  textDecoration: 'none'
                }}
              >
                Tap to Call
              </a>
            </div>
          </div>
        ))}
      </div>
      
      <div className="card" style={{ maxWidth: '900px', margin: '3rem auto 0', background: 'var(--primary-light)', borderLeft: '8px solid var(--primary-blue)' }}>
        <h3 style={{ marginTop: 0 }}>When to call 112?</h3>
        <p style={{ margin: 0 }}>
          <strong>112</strong> is a pan-India single emergency response number, similar to 911 in the US. 
          You can dial 112 from any phone (even without a SIM card or balance) to reach Police, Fire, Ambulance, or Disaster Management services.
        </p>
      </div>
    </div>
  );
};

export default Emergency;
