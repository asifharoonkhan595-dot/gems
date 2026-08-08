const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const password = req.headers['x-admin-password'];
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sql = neon(process.env.DATABASE_URL);

  // Create images table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      data TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  try {
    const { filename, data, mimeType } = req.body;

    if (!filename || !data) {
      return res.status(400).json({ error: 'Filename and image data are required' });
    }

    const result = await sql`
      INSERT INTO images (filename, mime_type, data)
      VALUES (${filename}, ${mimeType || 'image/jpeg'}, ${data})
      RETURNING id
    `;

    const imageId = result[0].id;
    // Return a URL that points to our own image serving endpoint
    const baseUrl = `https://${req.headers.host}`;
    const url = `${baseUrl}/api/image?id=${imageId}`;

    return res.status(200).json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
};
