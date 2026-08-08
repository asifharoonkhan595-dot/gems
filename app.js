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
        ? `<a href="${escapeHTML(gem.reelUrl)}" target="_blank" rel="noopener noreferrer" class="gem-btn gem-btn-reel">▶ Watch Reel</a>`
        : '';

      const profileBtn = gem.profileUrl
        ? `<a href="${escapeHTML(gem.profileUrl)}" target="_blank" rel="noopener noreferrer" class="gem-btn gem-btn-profile">👤 Profile</a>`
        : '';

      return `
        <div class="gem-card" style="animation-delay: ${index * 0.08}s">
          ${imageHTML}
          <div class="gem-card-body">
            <span class="gem-day-badge">Day ${gem.day}</span>
            <h2 class="gem-name">${escapeHTML(gem.name)}</h2>
            ${(reelBtn || profileBtn) ? `<div class="gem-actions">${reelBtn}${profileBtn}</div>` : ''}
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
