const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Image ID is required' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const result = await sql`SELECT mime_type, data FROM images WHERE id = ${Number(id)}`;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { mime_type, data } = result[0];
    const buffer = Buffer.from(data, 'base64');

    res.setHeader('Content-Type', mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Image serve error:', error);
    return res.status(500).json({ error: 'Failed to load image' });
  }
};
