module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const password = req.headers['x-admin-password'];
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Name parameter is required' });
  }

  const token = process.env.TMDB_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TMDB_API_TOKEN environment variable not set on Vercel.' });
  }

  try {
    // 1. Search for the person
    const searchRes = await fetch(`https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}&include_adult=false&language=en-US&page=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      }
    });
    
    if (!searchRes.ok) {
      throw new Error(`TMDB Search failed: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) {
      return res.status(404).json({ error: 'Person not found on TMDB' });
    }

    // Get the first result
    const person = searchData.results[0];
    const personId = person.id;

    // 2. Fetch full details (for biography)
    const detailsRes = await fetch(`https://api.themoviedb.org/3/person/${personId}?language=en-US`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      }
    });

    if (!detailsRes.ok) {
      throw new Error(`TMDB Details failed: ${detailsRes.statusText}`);
    }

    const detailsData = await detailsRes.json();

    const imageUrl = detailsData.profile_path ? `https://image.tmdb.org/t/p/w500${detailsData.profile_path}` : null;

    return res.status(200).json({
      name: detailsData.name,
      bio: detailsData.biography || '',
      imageUrl: imageUrl,
      tmdbId: detailsData.id,
      popularity: detailsData.popularity
    });

  } catch (error) {
    console.error('TMDB API error:', error);
    return res.status(500).json({ error: 'Failed to fetch from TMDB' });
  }
};
