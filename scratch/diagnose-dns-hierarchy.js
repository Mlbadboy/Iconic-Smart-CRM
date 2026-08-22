const dns = require('dns').promises;

async function diagnoseDns() {
  console.log('🔍 Diagnosing Authoritative DNS Hierarchy for charlieai.in...\n');

  try {
    const ns = await dns.resolveNs('charlieai.in');
    console.log('1. Authoritative Nameservers for charlieai.in:', ns);
  } catch (e) {
    console.log('1. NS query error:', e.message);
  }

  const variations = [
    'crm.charlieai.in',
    'crm.charlieai.in.charlieai.in',
    'www.charlieai.in',
    'charlieai.in'
  ];

  for (const domain of variations) {
    console.log(`\nTesting lookup for: "${domain}"`);
    try {
      const cname = await dns.resolveCname(domain);
      console.log(`  ✅ CNAME:`, cname);
    } catch (e) {
      console.log(`  ❌ CNAME error:`, e.code || e.message);
    }

    try {
      const a = await dns.resolve4(domain);
      console.log(`  ✅ A records:`, a);
    } catch (e) {
      console.log(`  ❌ A record error:`, e.code || e.message);
    }
  }
}

diagnoseDns();
