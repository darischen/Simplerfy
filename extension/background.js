// Background service worker for Simplerfy extension

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncProfile') {
    syncProfileFromApp().then(sendResponse);
    return true; // Keep the message channel open for async response
  }
});

// Sync profile by reading localStorage from Simplerfy app
async function syncProfileFromApp() {
  try {
    // First, try to find an existing Simplerfy tab
    const tabs = await chrome.tabs.query({ url: 'http://localhost:3000/*' });

    let tab;
    if (tabs.length > 0) {
      // Use existing tab
      tab = tabs[0];
    } else {
      // Create a new tab and wait for it to load
      tab = await chrome.tabs.create({
        url: 'http://localhost:3000',
        active: false
      });

      // Wait for the tab to finish loading
      await waitForTabLoad(tab.id);
    }

    // Execute script to read localStorage
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: readLocalStorage
    });

    // Close the tab if we created it
    if (tabs.length === 0) {
      await chrome.tabs.remove(tab.id);
    }

    if (results && results[0] && results[0].result) {
      const profile = results[0].result;

      // Validate profile has required data
      if (profile && profile.basics) {
        return { success: true, profile };
      } else {
        return { success: false, error: 'Profile is incomplete. Please fill out your profile in the Simplerfy app.' };
      }
    } else {
      return { success: false, error: 'No profile found in Simplerfy. Please create your profile first.' };
    }
  } catch (error) {
    console.error('Sync error:', error);

    // Handle common errors
    if (error.message?.includes('Cannot access')) {
      return { success: false, error: 'Cannot access Simplerfy. Make sure the app is running at localhost:3000.' };
    }

    return { success: false, error: 'Failed to sync profile. Please make sure Simplerfy is running.' };
  }
}

// Function to read localStorage (executed in the context of the Simplerfy page)
function readLocalStorage() {
  try {
    const profileData = localStorage.getItem('simplerfy_profile');
    if (profileData) {
      return JSON.parse(profileData);
    }
    return null;
  } catch (e) {
    console.error('Error reading localStorage:', e);
    return null;
  }
}

// Wait for a tab to finish loading
function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Tab load timeout'));
    }, 10000);

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        // Give it a bit more time for React to hydrate
        setTimeout(resolve, 500);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Simplerfy extension installed');
  }
});
