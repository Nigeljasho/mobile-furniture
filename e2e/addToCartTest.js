(async () => {
  try {
    const base = 'http://localhost:3000/api/v1';
    const email = `testbuyer+${Date.now()}@example.com`;
    console.log('Registering user:', email);
    const regRes = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Test Buyer', email, password: 'password123', role: 'buyer' }),
    });
    const regJson = await regRes.json();
    console.log('Register response:', regJson);
    if (!regJson.token) {
      console.error('No token returned; aborting');
      process.exit(1);
    }
    const token = regJson.token;

    const productId = '698cd78181107a261fd3f2db';
    console.log('Adding product to cart:', productId);
    const addRes = await fetch(`${base}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    const addJson = await addRes.json();
    console.log('Add to cart response:', JSON.stringify(addJson, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(2);
  }
})();
