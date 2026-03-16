async function triggerCron() {
  const url = "https://sneko-cat.vercel.app/api/cron/post";
  const secret = "shimao-kurosuke-mochiko";
  
  console.log(`Triggering cron at ${url}...`);
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secret}`
      }
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

triggerCron();
