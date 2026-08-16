import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    area: '',
    city: '',
    state: '',
    postal_code: '',
    latitude: '',
    longitude: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }
    if (!agreedToTerms) {
      return setError("You must agree to the Terms of Service and Privacy Policy");
    }
    
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
        address: formData.address,
        area: formData.area,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined
      };
      
      await api.post('/auth/register', payload);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }, (err) => {
        alert("Could not get location. Please enter manually.");
      });
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="text-center mb-4">
        <h2>Create an Account</h2>
        <p className="text-secondary">Register for the Citizen Portal</p>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleRegister}>
        <h4>Personal Information</h4>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" name="name" className="form-control" onChange={handleChange} required />
        </div>
        <div className="grid grid-2">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" className="form-control" onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Mobile Number</label>
            <input type="text" name="phone" className="form-control" onChange={handleChange} />
          </div>
        </div>

        <h4>Security</h4>
        <div className="grid grid-2">
          <div className="form-group">
            <label>Password</label>
            <div className="input-icon-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                className="form-control" 
                onChange={handleChange} 
                required minLength={6} 
              />
              <button 
                type="button" 
                className="input-icon-toggle" 
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <div className="input-icon-wrapper">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                name="confirmPassword" 
                className="form-control" 
                onChange={handleChange} 
                required 
              />
              <button 
                type="button" 
                className="input-icon-toggle" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
        </div>

        <h4>Location Details</h4>
        <div className="form-group">
          <label>Address</label>
          <input type="text" name="address" className="form-control" onChange={handleChange} />
        </div>
        <div className="grid grid-2">
          <div className="form-group">
            <label>Area/Locality</label>
            <input type="text" name="area" className="form-control" onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>City</label>
            <input type="text" name="city" className="form-control" onChange={handleChange} />
          </div>
        </div>
        <div className="grid grid-2">
          <div className="form-group">
            <label>State</label>
            <input type="text" name="state" className="form-control" onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>PIN/Postal Code</label>
            <input type="text" name="postal_code" className="form-control" onChange={handleChange} />
          </div>
        </div>
        
        <div className="form-group mt-2 mb-4">
          <button type="button" className="btn" onClick={getLocation} style={{border: '1px solid var(--border)', background: 'var(--surface)'}}>
            📍 Get GPS Coordinates
          </button>
          <span style={{marginLeft: '1rem'}} className="text-secondary">
            {formData.latitude && formData.longitude ? `Lat: ${formData.latitude}, Lng: ${formData.longitude}` : ''}
          </span>
        </div>

        <div className="form-group mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="terms" 
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            required
            style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
          />
          <label htmlFor="terms" style={{ margin: 0, cursor: 'pointer' }}>
            I agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>
          </label>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Registering...' : 'Register Account'}
        </button>
      </form>

      <div className="text-center mt-3">
        <p>Already have an account? <Link to="/login">Sign In</Link></p>
      </div>
    </div>
  );
};

export default Register;
