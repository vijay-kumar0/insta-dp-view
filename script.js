/* ═══════════════════════════════════════════════════
   Instaview — script.js
   Premium Instagram DP Viewer Logic
   ═══════════════════════════════════════════════════ */

'use strict';

/* ── Constants ──────────────────────────────────────── */
const API_BASE      = '';  // Netlify pe same domain use hoga
const HISTORY_KEY   = 'instaview_history';
const MAX_HISTORY   = 8;

/* ── DOM References ─────────────────────────────────── */
const usernameInput   = document.getElementById('usernameInput');
const viewBtn         = document.getElementById('viewBtn');
const clearInput      = document.getElementById('clearInput');
const errorMsg        = document.getElementById('errorMsg');
const historySection  = document.getElementById('historySection');
const historyChips    = document.getElementById('historyChips');
const clearHistoryBtn = document.getElementById('clearHistory');
const resultSection   = document.getElementById('resultSection');
const skeleton        = document.getElementById('skeleton');
const resultContent   = document.getElementById('resultContent');
const profileImg      = document.getElementById('profileImg');
const resultUsername  = document.getElementById('resultUsername');
const downloadBtn     = document.getElementById('downloadBtn');
const fullscreenBtn   = document.getElementById('fullscreenBtn');
const copyBtn         = document.getElementById('copyBtn');
const copyFeedback    = document.getElementById('copyFeedback');
const modalOverlay    = document.getElementById('modalOverlay');
const modalImg        = document.getElementById('modalImg');
const modalUsername   = document.getElementById('modalUsername');
const modalClose      = document.getElementById('modalClose');
const toast           = document.getElementById('toast');
const btnText         = viewBtn.querySelector('.btn-text');

/* ── State ───────────────────────────────────────────── */
let currentImageUrl = '';
let currentUsername = '';
let toastTimer      = null;

/* ─────────────────────────────────────────────────────
   SCROLL REVEAL
   ───────────────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ─────────────────────────────────────────────────────
   AUTO-FOCUS INPUT
   ───────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => usernameInput.focus(), 600);
});

/* ─────────────────────────────────────────────────────
   INPUT EVENTS
   ───────────────────────────────────────────────────── */
usernameInput.addEventListener('input', () => {
  const val = usernameInput.value.trim();
  clearInput.style.display = val ? 'flex' : 'none';
  if (val) hideError();
});

// Clear input button
clearInput.addEventListener('click', () => {
  usernameInput.value = '';
  clearInput.style.display = 'none';
  usernameInput.focus();
  hideError();
});

// Enter key triggers search
usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fetchDP();
});

// View button
viewBtn.addEventListener('click', (e) => {
  addRipple(e, viewBtn);
  fetchDP();
});

/* ─────────────────────────────────────────────────────
   RIPPLE EFFECT
   ───────────────────────────────────────────────────── */
function addRipple(e, btn) {
  const ripple = btn.querySelector('.btn-ripple');
  if (!ripple) return;

  const rect   = btn.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height) * 1.5;
  const x      = e.clientX - rect.left - size / 2;
  const y      = e.clientY - rect.top  - size / 2;

  ripple.style.cssText = `
    width: ${size}px; height: ${size}px;
    left: ${x}px; top: ${y}px;
    position: absolute;
  `;
  ripple.classList.remove('animate');
  /* Force reflow */
  void ripple.offsetWidth;
  ripple.classList.add('animate');
}

/* ─────────────────────────────────────────────────────
   MAIN FETCH FUNCTION
   ───────────────────────────────────────────────────── */
async function fetchDP() {
  const raw      = usernameInput.value.trim();
  const username = raw.replace(/^@/, '').toLowerCase();

  /* Validate */
  if (!username) {
    showError('Please enter an Instagram username.');
    shakeInput();
    return;
  }
  if (!/^[a-z0-9._]{1,30}$/.test(username)) {
    showError('Invalid username. Use only letters, numbers, periods, or underscores.');
    shakeInput();
    return;
  }

  /* Start loading */
  setLoading(true);
  hideError();
  showResultSkeleton();

  try {
    const response = await fetch(`/.netlify/functiond/user?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12000)          // 12-second timeout
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Error ${response.status}: Could not fetch profile.`);
    }

    const data = await response.json();

    if (!data.profile) throw new Error('No profile picture returned by the server.');

    /* Success */
    currentImageUrl = data.profile;
    currentUsername = username;
    displayResult(username, data.profile);
    saveHistory(username);
    renderHistory();

  } catch (err) {
    hideResultSection();

    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      showError('Request timed out. Check your connection or try again.');
    } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      showError('Cannot reach the server. Make sure the Express backend is running on port 3000.');
    } else {
      showError(err.message || 'Something went wrong. Please try again.');
    }
  } finally {
    setLoading(false);
  }
}

/* ─────────────────────────────────────────────────────
   DISPLAY RESULT
   ───────────────────────────────────────────────────── */
function showResultSkeleton() {
  resultSection.style.display = 'block';
  skeleton.style.display       = 'flex';
  resultContent.style.display  = 'none';
  /* Scroll to result */
  setTimeout(() => resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

function displayResult(username, imageUrl) {
  skeleton.style.display = 'none';

  /* Set image — use lazy load + fade-in */
  profileImg.style.opacity = '0';
  profileImg.src = imageUrl;
  profileImg.onload = () => {
    profileImg.style.transition = 'opacity 0.5s ease';
    profileImg.style.opacity    = '1';
  };
  profileImg.onerror = () => {
    showError('Could not load the profile image. The URL may have expired.');
    hideResultSection();
  };

  resultUsername.textContent = `@${username}`;
  resultContent.style.display = 'block';
  resultSection.style.display = 'block';
}

function hideResultSection() {
  resultSection.style.display = 'none';
  currentImageUrl = '';
  currentUsername = '';
}

/* ─────────────────────────────────────────────────────
   DOWNLOAD
   ───────────────────────────────────────────────────── */
downloadBtn.addEventListener('click', async () => {
  if (!currentImageUrl) return;

  try {
    /* Attempt proper blob download */
    const response  = await fetch(currentImageUrl);
    const blob      = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link      = document.createElement('a');

    link.href     = objectUrl;
    link.download = `${currentUsername || 'profile'}_dp.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);

    showToast('✓ Download started');
  } catch {
    /* Fallback: open in new tab */
    window.open(currentImageUrl, '_blank');
    showToast('Opened in new tab');
  }
});

/* ─────────────────────────────────────────────────────
   COPY LINK
   ───────────────────────────────────────────────────── */
copyBtn.addEventListener('click', async () => {
  if (!currentImageUrl) return;

  try {
    await navigator.clipboard.writeText(currentImageUrl);
    copyFeedback.textContent = '✓ Image URL copied to clipboard';
    showToast('✓ Link copied!');
    setTimeout(() => { copyFeedback.textContent = ''; }, 3000);
  } catch {
    /* Fallback for older browsers */
    const ta = document.createElement('textarea');
    ta.value = currentImageUrl;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copyFeedback.textContent = '✓ Copied!';
    setTimeout(() => { copyFeedback.textContent = ''; }, 3000);
  }
});

/* ─────────────────────────────────────────────────────
   FULLSCREEN MODAL
   ───────────────────────────────────────────────────── */
function openModal() {
  if (!currentImageUrl) return;
  modalImg.src             = currentImageUrl;
  modalUsername.textContent = `@${currentUsername}`;
  modalOverlay.classList.remove('hidden');
  modalOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  modalOverlay.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  setTimeout(() => { modalOverlay.style.display = 'none'; }, 300);
}

fullscreenBtn.addEventListener('click', openModal);
profileImg.addEventListener('click', openModal);

/* Close on overlay background click */
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

/* Close button */
modalClose.addEventListener('click', closeModal);

/* Keyboard: ESC to close, Enter to open */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ─────────────────────────────────────────────────────
   SEARCH HISTORY
   ───────────────────────────────────────────────────── */
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(username) {
  let history = loadHistory();
  /* Remove duplicates, put latest first */
  history = [username, ...history.filter(u => u !== username)].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* localStorage may be unavailable */ }
}

function renderHistory() {
  const history = loadHistory();
  if (!history.length) {
    historySection.style.display = 'none';
    return;
  }
  historySection.style.display = 'block';
  historyChips.innerHTML = '';

  history.forEach(username => {
    const chip = document.createElement('button');
    chip.className       = 'history-chip';
    chip.textContent     = `@${username}`;
    chip.setAttribute('role', 'listitem');
    chip.setAttribute('aria-label', `Search ${username}`);
    chip.addEventListener('click', () => {
      usernameInput.value         = username;
      clearInput.style.display    = 'flex';
      fetchDP();
    });
    historyChips.appendChild(chip);
  });
}

clearHistoryBtn.addEventListener('click', () => {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* noop */ }
  historySection.style.display = 'none';
  showToast('History cleared');
});

// Initialise history on load
renderHistory();

/* ─────────────────────────────────────────────────────
   UI HELPERS
   ───────────────────────────────────────────────────── */
function setLoading(isLoading) {
  viewBtn.disabled = isLoading;
  if (isLoading) {
    viewBtn.classList.add('loading');
    btnText.textContent = 'Fetching';
  } else {
    viewBtn.classList.remove('loading');
    btnText.textContent = 'View Profile Picture';
  }
}

function showError(msg) {
  errorMsg.textContent = `⚠ ${msg}`;
  errorMsg.classList.add('show');
}

function hideError() {
  errorMsg.classList.remove('show');
  errorMsg.textContent = '';
}

function shakeInput() {
  const wrap = document.querySelector('.input-wrap');
  wrap.style.animation = 'none';
  void wrap.offsetWidth;  // reflow
  wrap.style.animation = 'shake 0.4s ease';
}

/* Inject shake keyframes dynamically */
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);

/* ─────────────────────────────────────────────────────
   TOAST NOTIFICATION
   ───────────────────────────────────────────────────── */
function showToast(message, duration = 2800) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ─────────────────────────────────────────────────────
   AVATAR PARALLAX (desktop)
   ───────────────────────────────────────────────────── */
document.addEventListener('mousemove', (e) => {
  const orb1 = document.querySelector('.orb-1');
  const orb2 = document.querySelector('.orb-2');
  if (!orb1 || !orb2) return;

  const xPct = (e.clientX / window.innerWidth  - 0.5) * 30;
  const yPct = (e.clientY / window.innerHeight - 0.5) * 30;

  orb1.style.transform = `translate(${xPct * 0.6}px, ${yPct * 0.6}px) scale(1)`;
  orb2.style.transform = `translate(${-xPct * 0.4}px, ${-yPct * 0.4}px) scale(1)`;
});
