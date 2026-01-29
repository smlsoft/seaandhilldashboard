// Test Web Search APIs (Serper + SerpApi)
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

async function testSerperApi() {
  const query = 'แนวโน้มราคาเหล็กโลก 2025';
  const apiKey = envVars.SERPER_API_KEY;

  console.log('=== Testing Serper API ===');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT SET');
  console.log('Query:', query);
  console.log('');

  if (!apiKey) {
    console.error('❌ Error: Missing SERPER_API_KEY');
    return false;
  }

  try {
    console.log('Calling Serper API...');

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'th',
        hl: 'th',
        num: 3
      })
    });

    const data = await response.json();

    if (data.message === 'Unauthorized.') {
      console.error('❌ Serper API Error: Unauthorized');
      return false;
    }

    if (data.organic && data.organic.length > 0) {
      console.log(`✅ Serper Success! Found ${data.organic.length} results\n`);
      data.organic.slice(0, 2).forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   URL: ${item.link}`);
      });
      return true;
    } else {
      console.log('⚠️ No results found');
      return false;
    }
  } catch (error) {
    console.error('❌ Serper Error:', error.message);
    return false;
  }
}

async function testSerpApi() {
  const query = 'แนวโน้มราคาเหล็กโลก 2025';
  const apiKey = envVars.SERPAPI_API_KEY;

  console.log('\n=== Testing SerpApi ===');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT SET');
  console.log('Query:', query);
  console.log('');

  if (!apiKey) {
    console.error('❌ Error: Missing SERPAPI_API_KEY');
    return false;
  }

  try {
    console.log('Calling SerpApi...');

    const params = new URLSearchParams({
      api_key: apiKey,
      engine: 'google',
      q: query,
      gl: 'th',
      hl: 'th',
      num: '3'
    });

    const response = await fetch(`https://serpapi.com/search?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('❌ SerpApi Error:', data.error);
      return false;
    }

    if (data.organic_results && data.organic_results.length > 0) {
      console.log(`✅ SerpApi Success! Found ${data.organic_results.length} results\n`);
      data.organic_results.slice(0, 2).forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   URL: ${item.link}`);
      });
      return true;
    } else {
      console.log('⚠️ No results found');
      return false;
    }
  } catch (error) {
    console.error('❌ SerpApi Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Web Search API Test\n');
  console.log('=====================================\n');

  const serperOk = await testSerperApi();
  const serpApiOk = await testSerpApi();

  console.log('\n=====================================');
  console.log('📋 Summary:');
  console.log(`   Serper API:  ${serperOk ? '✅ Working' : '❌ Not working'}`);
  console.log(`   SerpApi:     ${serpApiOk ? '✅ Working' : '❌ Not working'}`);
  console.log('=====================================\n');

  if (serperOk || serpApiOk) {
    console.log('✅ At least one search API is working. Web search is ready!');
  } else {
    console.log('❌ No search API is working. Please check your API keys.');
  }
}

main();
