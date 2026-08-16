import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ReportComplaint = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/dashboard');
  }, [navigate]);

  return null;
};

export default ReportComplaint;
