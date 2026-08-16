async function testLiveRailway() {
  const loginRes = await fetch('https://iconicsmartcrm.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@iconic-crm.com', password: 'admin123' })
  }).then(r => r.json());

  console.log('✅ Live Admin Login Success:', loginRes.user?.name || loginRes);
  const token = loginRes.token;

  // Import test serial
  const csvText = 'materialCode,serialNumber,dealerCode\nMAT-569553,SN-771740,DLR-548968';
  const importRes = await fetch('https://iconicsmartcrm.up.railway.app/api/serial-validation/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ csvData: csvText })
  }).then(r => r.json());

  console.log('✅ Live CSV Serial Import Result:', importRes);

  // Validate serial
  const validateRes = await fetch('https://iconicsmartcrm.up.railway.app/api/serial-validation/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      materialCode: 'MAT-569553',
      serialNumber: 'SN-771740',
      dealerCode: 'DLR-548968'
    })
  }).then(r => r.json());

  console.log('✅ Live Serial Validation Result:', validateRes);
}

testLiveRailway().catch(err => console.error('Live Test Error:', err));
