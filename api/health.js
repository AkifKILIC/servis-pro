export default async function handler(req, res) {
  try {
    const testRes = await fetch('https://ntfy.sh', { method: 'HEAD' });
    return res.status(200).json({ 
      status: 'ok', 
      ntfyStatus: testRes.status,
      region: process.env.VERCEL_REGION || 'local',
      time: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
