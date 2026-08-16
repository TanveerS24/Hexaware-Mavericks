const axios = require('axios');

axios.post('https://hexaware-mavericks.onrender.com/citizen/auth/register', {
    name: 'Nanyam Palli Moksha Sai',
    email: 'nmokshasai7@gmail.com',
    phone: '06281734761',
    password: 'password123',
    address: '4-19,lingala,kadapa,Andhra Pradesh',
    area: 'proddutur',
    city: 'Kadapa',
    state: 'Andhra Pradesh',
    postal_code: '516396',
    latitude: 13.0242,
    longitude: 80.0217
}).then(res => console.log("SUCCESS:", res.data))
  .catch(err => {
      console.log("ERROR STATUS:", err.response?.status);
      console.log("ERROR DATA:", JSON.stringify(err.response?.data, null, 2));
      console.log("MESSAGE:", err.message);
  });
