document.addEventListener('DOMContentLoaded', () => {
  fetchGems();
});

async function fetchGems() {
  const container = document.getElementById('gemsContainer');
  const dayCounter = document.getElementById('dayCounter');

  try {
    const response = await fetch('/api/gems');
    const gems = await response.json();

    if (gems.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💎</div>
          <h3>No gems discovered yet</h3>
          <p>Check back soon — new gems are added daily!</p>
        </div>
      `;
      dayCounter.textContent = '🎬 Starting Soon';
      return;
    }

    dayCounter.textContent = `🎬 ${gems.length} Gem${gems.length !== 1 ? 's' : ''} Discovered`;

    const cardsHTML = gems.map((gem, index) => {
      const imageHTML = gem.imageUrl
        ? `<img class="gem-card-image" src="${escapeHTML(gem.imageUrl)}" alt="${escapeHTML(gem.name)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="gem-card-image-placeholder" style="display:none;">💎</div>`
        : `<div class="gem-card-image-placeholder">💎</div>`;

      const reelBtn = gem.reelUrl
        ? `<a href="${escapeHTML(gem.reelUrl)}" target="_blank" rel="noopener noreferrer" class="gem-btn gem-btn-reel">Follow +</a>`
        : '';

      const profileBtn = gem.profileUrl
        ? `<a href="${escapeHTML(gem.profileUrl)}" target="_blank" rel="noopener noreferrer" class="gem-btn gem-btn-profile">Profile</a>`
        : '';

      const bioText = gem.bio ? escapeHTML(gem.bio) : 'A newly discovered gem.';

      return `
        <div class="gem-card" style="animation-delay: ${index * 0.08}s">
          ${imageHTML}
          <div class="gem-card-body">
            <div class="gem-header-row">
              <h2 class="gem-name">${escapeHTML(gem.name)}</h2>
              <span class="verified-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-7.9 7.9z"/>
                </svg>
              </span>
            </div>
            
            <p class="gem-bio">${bioText}</p>
            
            <div class="gem-footer-row">
              <div class="gem-stats">
                <span>
                  <svg class="gem-stats-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Day ${gem.day}
                </span>
              </div>
              <div class="gem-btn-group">
                ${profileBtn}
                ${reelBtn}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="gems-grid">${cardsHTML}</div>`;

  } catch (error) {
    console.error('Failed to fetch gems:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p>Could not load gems. Please try again later.</p>
      </div>
    `;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
