let adminPassword = sessionStorage.getItem('adminPassword') || '';

document.addEventListener('DOMContentLoaded', () => {
  if (adminPassword) {
    showAdminPanel();
  }

  // Allow Enter key on password input
  document.getElementById('passwordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptLogin();
  });
});

async function attemptLogin() {
  const password = document.getElementById('passwordInput').value.trim();
  if (!password) {
    showToast('Please enter a password', 'error');
    return;
  }

  const loginBtn = document.getElementById('loginBtn');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Checking...';

  try {
    // Verify password against server by making a test request
    const response = await fetch('/api/gems');
    if (!response.ok) {
      showToast('Server error. Try again.', 'error');
      return;
    }

    // Try a dummy POST to verify the password works
    const testRes = await fetch('/api/gems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ day: 0, name: '' }),
    });

    // 401 = wrong password, 400 = password correct but validation error (expected)
    if (testRes.status === 401) {
      showToast('Wrong password!', 'error');
      return;
    }

    // Password is valid (we got 400 = bad request, which means auth passed)
    adminPassword = password;
    sessionStorage.setItem('adminPassword', password);
    showAdminPanel();

  } catch (error) {
    showToast('Cannot connect to server', 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Unlock';
  }
}

function logout() {
  adminPassword = '';
  sessionStorage.removeItem('adminPassword');
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('passwordInput').value = '';
}

function showAdminPanel() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  loadGems();
}

async function loadGems() {
  const listEl = document.getElementById('gemsList');
  listEl.innerHTML = '<p style="color: var(--text-dim);">Loading...</p>';

  try {
    const response = await fetch('/api/gems');
    const gems = await response.json();

    if (gems.length === 0) {
      listEl.innerHTML = '<p style="color: var(--text-dim); text-align: center; padding: 2rem;">No gems yet. Add your first one above!</p>';
      // Auto-set day number to 1
      document.getElementById('gemDay').value = 1;
      return;
    }

    // Auto-set next day number
    const maxDay = Math.max(...gems.map(g => g.day));
    document.getElementById('gemDay').value = maxDay + 1;

    listEl.innerHTML = `<ul class="gems-list">
      ${gems.map(gem => {
        const imgHTML = gem.imageUrl
          ? `<img class="gems-list-item-img" src="${escapeHTML(gem.imageUrl)}" alt="${escapeHTML(gem.name)}" onerror="this.style.display='none'">`
          : '<div class="gems-list-item-img" style="background: var(--bg-card); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">💎</div>';

        return `<li class="gems-list-item">
          <div class="gems-list-item-info">
            ${imgHTML}
            <div>
              <span class="gems-list-item-day">Day ${gem.day}</span>
              <span class="gems-list-item-name"> — ${escapeHTML(gem.name)}</span>
            </div>
          </div>
          <button class="btn-delete" onclick="deleteGem(${gem.day})">Delete</button>
        </li>`;
      }).join('')}
    </ul>`;

  } catch (error) {
    console.error('Failed to load gems:', error);
    listEl.innerHTML = '<p style="color: var(--red);">Failed to load gems. Check your connection.</p>';
  }
}

let selectedFile = null;
let currentCropper = null;
let currentTmdbData = null;

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    initCropper(file);
  }
}

function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  initCropper(file);
  input.value = ''; // Reset input so same file can be selected again
}

function initCropper(file) {
  selectedFile = file; // Temporarily store original file name/type
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const cropperImage = document.getElementById('cropperImage');
    cropperImage.src = e.target.result;
    document.getElementById('cropperModal').style.display = 'flex';
    
    if (currentCropper) {
      currentCropper.destroy();
    }
    
    currentCropper = new Cropper(cropperImage, {
      aspectRatio: 3 / 4, // Aspect ratio matching reference design
      viewMode: 1,
      autoCropArea: 1,
    });
  };
  reader.readAsDataURL(file);
}

function closeCropperModal() {
  document.getElementById('cropperModal').style.display = 'none';
  if (currentCropper) {
    currentCropper.destroy();
    currentCropper = null;
  }
}

function applyCrop() {
  if (!currentCropper) return;
  
  // Get cropped canvas
  const canvas = currentCropper.getCroppedCanvas({
    width: 600,
    height: 800
  });
  
  // Convert to base64 for preview
  const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
  
  // Update preview
  document.getElementById('previewImg').src = croppedDataUrl;
  document.getElementById('imagePreview').style.display = 'block';
  
  // Convert to blob for upload and store in selectedFile (replacing original)
  canvas.toBlob((blob) => {
    selectedFile = new File([blob], selectedFile.name || 'cropped.jpg', { type: 'image/jpeg' });
  }, 'image/jpeg', 0.9);
  
  closeCropperModal();
}

function clearImageSelection() {
  selectedFile = null;
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('previewImg').src = '';
  document.getElementById('gemImage').value = '';
}

// ---- TMDB LOGIC ----

async function fetchTmdbData() {
  const name = document.getElementById('gemName').value.trim();
  if (!name) {
    showToast('Please enter an actor name first', 'error');
    return;
  }

  const btn = document.getElementById('btnTmdb');
  btn.textContent = '⏳ Loading...';
  btn.disabled = true;

  try {
    const response = await fetch(`/api/tmdb?name=${encodeURIComponent(name)}`, {
      headers: {
        'x-admin-password': adminPassword
      }
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    currentTmdbData = await response.json();
    
    const content = `
      <div style="margin-bottom: 1rem;">
        ${currentTmdbData.imageUrl ? `<img src="${currentTmdbData.imageUrl}" class="tmdb-result-img" alt="TMDB Profile">` : '<div class="tmdb-result-img" style="background:#222;height:180px;display:flex;align-items:center;justify-content:center;">No Image</div>'}
        <h4 style="color:var(--text);font-size:1.1rem;">${currentTmdbData.name}</h4>
        <p style="color:var(--text-dim);font-size:0.8rem;margin-top:0.2rem;">Popularity: ${currentTmdbData.popularity}</p>
        <p class="tmdb-bio">${currentTmdbData.bio || 'No biography found.'}</p>
      </div>
    `;
    
    document.getElementById('tmdbContent').innerHTML = content;
    document.getElementById('tmdbModal').style.display = 'flex';

  } catch (error) {
    console.error('TMDB Error:', error);
    showToast('Could not fetch TMDB data', 'error');
  } finally {
    btn.textContent = '🔍 Get TMDB Data';
    btn.disabled = false;
  }
}

function closeTmdbModal() {
  document.getElementById('tmdbModal').style.display = 'none';
  currentTmdbData = null;
}

function applyTmdbData() {
  if (!currentTmdbData) return;
  
  document.getElementById('gemName').value = currentTmdbData.name;
  
  if (currentTmdbData.bio) {
    document.getElementById('gemBio').value = currentTmdbData.bio;
  }
  
  if (currentTmdbData.imageUrl) {
    document.getElementById('gemImage').value = currentTmdbData.imageUrl;
    clearImageSelection(); // prioritize URL over file
  }
  
  closeTmdbModal();
  showToast('TMDB data applied!', 'success');
}

async function uploadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]; // Remove data:image/...;base64, prefix
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify({
            filename: file.name,
            data: base64,
            mimeType: file.type || 'image/jpeg',
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          reject(new Error(err.error || 'Upload failed'));
          return;
        }

        const result = await response.json();
        resolve(result.url);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}

async function handleAddGem(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding...';

  // Upload image first if a file was selected
  let imageUrl = document.getElementById('gemImage').value.trim();

  if (selectedFile) {
    submitBtn.textContent = 'Uploading image...';
    try {
      imageUrl = await uploadImage(selectedFile);
    } catch (err) {
      showToast('Image upload failed: ' + err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Gem';
      return;
    }
  }

  const gem = {
    day: parseInt(document.getElementById('gemDay').value),
    name: document.getElementById('gemName').value.trim(),
    bio: document.getElementById('gemBio').value.trim(),
    imageUrl: imageUrl,
    reelUrl: document.getElementById('gemReel').value.trim(),
    profileUrl: document.getElementById('gemProfile').value.trim(),
  };

  if (!gem.day || !gem.name) {
    showToast('Day and Name are required', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Gem';
    return;
  }

  try {
    const response = await fetch('/api/gems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword,
      },
      body: JSON.stringify(gem),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        showToast('Wrong password. Please log in again.', 'error');
        logout();
      } else {
        showToast(data.error || 'Failed to add gem', 'error');
      }
      return;
    }

    showToast(`Day ${gem.day} — ${gem.name} added! 🎉`, 'success');
    document.getElementById('addGemForm').reset();
    clearImageSelection();
    loadGems();

  } catch (error) {
    console.error('Failed to add gem:', error);
    showToast('Network error. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Gem';
  }
}

async function deleteGem(day) {
  if (!confirm(`Delete Day ${day}? This cannot be undone.`)) return;

  try {
    const response = await fetch('/api/gems', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword,
      },
      body: JSON.stringify({ day }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        showToast('Wrong password. Please log in again.', 'error');
        logout();
      } else {
        showToast(data.error || 'Failed to delete gem', 'error');
      }
      return;
    }

    showToast(`Day ${day} deleted`, 'success');
    loadGems();

  } catch (error) {
    console.error('Failed to delete gem:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type} toast-show`;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 3000);
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
