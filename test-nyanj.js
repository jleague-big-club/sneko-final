fetch('https://sneko-cat.vercel.app/api/cron/post?debug=true', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer shimao-kurosuke-mochiko'
  }
})
.then(async res => {
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Raw Response:");
  console.log(text);
})
.catch(err => console.error(err));
