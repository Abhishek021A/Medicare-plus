const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testCreateProduct() {
  const form = new FormData();
  form.append('name', 'Vitamin C 500mg Test');
  form.append('slug', 'vitamin-c-500mg-test');
  form.append('sku', 'MED-VIT-C-999');
  form.append('price', '499');
  form.append('stock_quantity', '100');
  form.append('category_id', '1');
  form.append('status', 'ACTIVE');
  
  try {
    const res = await axios.post('http://localhost:8000/api/index.php/products', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: 'Bearer mock-admin-token-123'
      }
    });
    console.log(res.data);
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
  }
}

testCreateProduct();
