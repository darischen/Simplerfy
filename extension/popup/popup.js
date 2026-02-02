// DOM Elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const noProfileSection = document.getElementById('no-profile-section');
const profileSection = document.getElementById('profile-section');
const syncBtn = document.getElementById('sync-btn');
const resyncBtn = document.getElementById('resync-btn');
const fillBtn = document.getElementById('fill-btn');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileJob = document.getElementById('profile-job');
const resumeSelect = document.getElementById('resume-select');
const resumeHint = document.getElementById('resume-hint');
const resumeActions = document.getElementById('resume-actions');
const downloadResumeBtn = document.getElementById('download-resume-btn');
const fillResult = document.getElementById('fill-result');
const fillResultContent = document.getElementById('fill-result-content');

// Current profile data
let currentProfile = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkProfile();

  // Set up event listeners
  syncBtn.addEventListener('click', syncProfile);
  resyncBtn.addEventListener('click', syncProfile);
  fillBtn.addEventListener('click', fillPage);
  downloadResumeBtn.addEventListener('click', downloadSelectedResume);
  resumeSelect.addEventListener('change', updateResumeActions);
});

// Check if profile exists in storage
async function checkProfile() {
  setStatus('loading', 'Checking profile...');

  try {
    const result = await chrome.storage.local.get(['simplerfy_profile']);
    const profile = result.simplerfy_profile;

    if (profile && profile.basics && profile.basics.firstName) {
      currentProfile = profile;
      displayProfile(profile);
      setStatus('success', 'Profile loaded');
      showSection('profile');
    } else {
      setStatus('error', 'No profile found');
      showSection('no-profile');
    }
  } catch (error) {
    console.error('Error checking profile:', error);
    setStatus('error', 'Error loading profile');
    showSection('no-profile');
  }
}

// Display profile data in UI
function displayProfile(profile) {
  currentProfile = profile;
  const { basics, experience, resumeFiles } = profile;

  // Set name
  const fullName = `${basics.firstName || ''} ${basics.lastName || ''}`.trim();
  profileName.textContent = fullName || 'No name set';

  // Set email
  profileEmail.textContent = basics.email || 'No email set';

  // Set most recent job
  if (experience && experience.length > 0) {
    const recentJob = experience[0];
    profileJob.textContent = `${recentJob.title} at ${recentJob.company}`;
  } else {
    profileJob.textContent = 'No work experience listed';
  }

  // Set up resume dropdown with PDF files
  if (resumeFiles && resumeFiles.length > 0) {
    resumeSelect.innerHTML = resumeFiles.map((resume) =>
      `<option value="${resume.id}">${resume.fileName}</option>`
    ).join('');
    resumeHint.textContent = `${resumeFiles.length} resume${resumeFiles.length > 1 ? 's' : ''} available`;
    resumeActions.classList.remove('hidden');
  } else {
    resumeSelect.innerHTML = '<option value="">No resumes uploaded</option>';
    resumeHint.textContent = 'Upload resumes in the Simplerfy Profile page';
    resumeActions.classList.add('hidden');
  }
}

// Update resume actions visibility
function updateResumeActions() {
  if (resumeSelect.value) {
    resumeActions.classList.remove('hidden');
  } else {
    resumeActions.classList.add('hidden');
  }
}

// Download selected resume
function downloadSelectedResume() {
  if (!currentProfile || !currentProfile.resumeFiles) return;

  const selectedId = resumeSelect.value;
  const resume = currentProfile.resumeFiles.find(r => r.id === selectedId);

  if (resume) {
    // Create blob from base64
    const byteCharacters = atob(resume.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: resume.fileType });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = resume.fileName;
    link.click();
    URL.revokeObjectURL(url);

    showResult('success', `Downloaded ${resume.fileName}`);
  }
}

// Sync profile from Simplerfy web app
async function syncProfile() {
  setStatus('loading', 'Syncing profile...');
  hideResult();

  try {
    // Send message to background script to fetch profile
    const response = await chrome.runtime.sendMessage({ action: 'syncProfile' });

    if (response.success && response.profile) {
      // Save to chrome storage
      await chrome.storage.local.set({ simplerfy_profile: response.profile });
      displayProfile(response.profile);
      setStatus('success', 'Profile synced!');
      showSection('profile');

      // Show resume count
      const resumeCount = response.profile.resumeFiles?.length || 0;
      if (resumeCount > 0) {
        showResult('success', `Synced profile with ${resumeCount} resume${resumeCount > 1 ? 's' : ''}`);
      }
    } else {
      setStatus('error', response.error || 'Failed to sync');
      showResult('error', response.error || 'Could not sync profile. Make sure Simplerfy is open at localhost:3000 and you have saved your profile.');
    }
  } catch (error) {
    console.error('Sync error:', error);
    setStatus('error', 'Sync failed');
    showResult('error', 'Failed to sync profile. Please try again.');
  }
}

// Fill the current page with profile data
async function fillPage() {
  setStatus('loading', 'Filling form...');
  hideResult();

  try {
    // Get profile from storage
    const result = await chrome.storage.local.get(['simplerfy_profile']);
    const profile = result.simplerfy_profile;

    if (!profile) {
      setStatus('error', 'No profile');
      showResult('error', 'No profile data found. Please sync first.');
      return;
    }

    // Get selected resume ID
    const selectedResumeId = resumeSelect.value;

    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      setStatus('error', 'No active tab');
      showResult('error', 'Could not find active tab.');
      return;
    }

    // Send fill message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'fill',
      profile: profile,
      selectedResumeId: selectedResumeId
    });

    if (response && response.success) {
      setStatus('success', 'Form filled!');
      const filledCount = response.filledFields || 0;
      let message = `Filled ${filledCount} field${filledCount !== 1 ? 's' : ''} successfully!`;

      if (response.resumeUploadDetected) {
        message += ' Resume upload field detected - click Download above to get your resume file.';
      }

      showResult('success', message);
    } else {
      setStatus('error', 'Fill failed');
      showResult('error', response?.error || 'Could not fill form. Make sure you are on a job application page.');
    }
  } catch (error) {
    console.error('Fill error:', error);
    setStatus('error', 'Fill failed');

    // Check if content script is not loaded
    if (error.message?.includes('Receiving end does not exist')) {
      showResult('error', 'This page is not supported. Navigate to a job application page (Greenhouse, Lever, Workday, etc.).');
    } else {
      showResult('error', 'Failed to fill form. Please refresh the page and try again.');
    }
  }
}

// UI Helper functions
function setStatus(type, text) {
  statusDot.className = 'status-dot ' + type;
  statusText.textContent = text;
}

function showSection(section) {
  noProfileSection.classList.add('hidden');
  profileSection.classList.add('hidden');

  if (section === 'no-profile') {
    noProfileSection.classList.remove('hidden');
  } else if (section === 'profile') {
    profileSection.classList.remove('hidden');
  }
}

function showResult(type, message) {
  fillResult.className = 'fill-result ' + type;
  fillResultContent.textContent = message;
  fillResult.classList.remove('hidden');
}

function hideResult() {
  fillResult.classList.add('hidden');
}
