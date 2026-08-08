const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(process.env.DATABASE_URL);

  // Auto-create table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS gems (
      id SERIAL PRIMARY KEY,
      day INTEGER UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      image_url TEXT DEFAULT '',
      reel_url TEXT DEFAULT '',
      profile_url TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      added_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Ensure bio column exists (migration for existing table)
  try {
    await sql`ALTER TABLE gems ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`;
  } catch (e) {
    // Ignore error if column already exists
  }

  function isAdmin(req) {
    const password = req.headers['x-admin-password'];
    return password && password === process.env.ADMIN_PASSWORD;
  }

  try {
    if (req.method === 'GET') {
      const gems = await sql`SELECT * FROM gems ORDER BY day DESC`;
      const formatted = gems.map(g => ({
        day: g.day,
        name: g.name,
        imageUrl: g.image_url,
        reelUrl: g.reel_url,
        profileUrl: g.profile_url,
        bio: g.bio,
        addedAt: g.added_at,
      }));
      return res.status(200).json(formatted);
    }

    if (req.method === 'POST') {
      if (!isAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { day, name, imageUrl, reelUrl, profileUrl, bio } = req.body;

      if (!day || !name) {
        return res.status(400).json({ error: 'Day and name are required' });
      }

      const dayNum = Number(day);

      // Check if day exists — update if so, insert if not
      const existing = await sql`SELECT id FROM gems WHERE day = ${dayNum}`;

      if (existing.length > 0) {
        await sql`
          UPDATE gems
          SET name = ${name},
              image_url = ${imageUrl || ''},
              reel_url = ${reelUrl || ''},
              profile_url = ${profileUrl || ''},
              bio = ${bio || ''}
          WHERE day = ${dayNum}
        `;
      } else {
        await sql`
          INSERT INTO gems (day, name, image_url, reel_url, profile_url, bio)
          VALUES (${dayNum}, ${name}, ${imageUrl || ''}, ${reelUrl || ''}, ${profileUrl || ''}, ${bio || ''})
        `;
      }

      const gems = await sql`SELECT * FROM gems ORDER BY day DESC`;
      const formatted = gems.map(g => ({
        day: g.day,
        name: g.name,
        imageUrl: g.image_url,
        reelUrl: g.reel_url,
        profileUrl: g.profile_url,
        addedAt: g.added_at,
      }));

      return res.status(200).json({ success: true, gems: formatted });
    }

    if (req.method === 'DELETE') {
      if (!isAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { day } = req.body;

      if (!day && day !== 0) {
        return res.status(400).json({ error: 'Day is required' });
      }

      await sql`DELETE FROM gems WHERE day = ${Number(day)}`;

      const gems = await sql`SELECT * FROM gems ORDER BY day DESC`;
      const formatted = gems.map(g => ({
        day: g.day,
        name: g.name,
        imageUrl: g.image_url,
        reelUrl: g.reel_url,
        profileUrl: g.profile_url,
        addedAt: g.added_at,
      }));

      return res.status(200).json({ success: true, gems: formatted });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
