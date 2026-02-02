// Content script for Simplerfy extension
// Handles form detection and autofill on job application pages

// Field patterns for detecting form inputs
const FIELD_PATTERNS = {
  firstName: ['first_name', 'firstname', 'first-name', 'fname', 'given_name', 'givenname', 'first'],
  lastName: ['last_name', 'lastname', 'last-name', 'lname', 'family_name', 'familyname', 'surname', 'last'],
  fullName: ['full_name', 'fullname', 'name', 'your_name', 'yourname', 'applicant_name', 'candidate_name'],
  email: ['email', 'e-mail', 'email_address', 'emailaddress', 'e_mail'],
  phone: ['phone', 'telephone', 'mobile', 'cell', 'phone_number', 'phonenumber', 'tel', 'contact_number'],
  linkedin: ['linkedin', 'linked_in', 'linkedin_url', 'linkedinurl', 'linkedin_profile'],
  github: ['github', 'git_hub', 'github_url', 'githuburl', 'github_profile'],
  website: ['website', 'portfolio', 'personal_site', 'personalsite', 'url', 'personal_website', 'homepage'],
  location: ['location', 'city', 'address', 'current_location', 'currentlocation'],
  company: ['company', 'employer', 'organization', 'current_company', 'currentcompany', 'current_employer'],
  title: ['title', 'position', 'job_title', 'jobtitle', 'current_title', 'currenttitle', 'role'],
  school: ['school', 'university', 'college', 'institution', 'education', 'alma_mater'],
  degree: ['degree', 'diploma', 'qualification'],
  major: ['major', 'field_of_study', 'fieldofstudy', 'concentration', 'specialization', 'field'],
  gpa: ['gpa', 'grade', 'grade_point', 'gradepoint', 'cgpa'],
  // Application preference patterns
  jobSource: ['hear_about', 'how_did_you_hear', 'source', 'referral_source', 'job_source', 'found_us', 'hear_about_us', 'how_heard'],
  authorized: ['authorized', 'authorised', 'legally_authorized', 'work_authorization', 'eligible_to_work', 'legally_eligible'],
  sponsorship: ['sponsor', 'visa', 'sponsorship', 'require_sponsor', 'need_visa', 'immigration'],
  relocate: ['relocate', 'relocation', 'willing_to_relocate', 'open_to_relocation'],
  over18: ['18', 'age', 'years_old', 'legal_age', 'eighteen', 'adult'],
  salary: ['salary', 'compensation', 'pay', 'desired_salary', 'expected_salary', 'salary_expectation'],
  startDate: ['start_date', 'available', 'availability', 'when_can_you_start', 'earliest_start'],
  gender: ['gender', 'sex'],
  ethnicity: ['ethnicity', 'race', 'ethnic', 'racial'],
  veteran: ['veteran', 'military', 'protected_veteran'],
  disability: ['disability', 'disabled', 'handicap']
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fill') {
    const result = fillForm(request.profile, request.selectedResumeId);
    sendResponse(result);
  }
  return true;
});

// Main function to fill the form
function fillForm(profile, selectedResumeId) {
  try {
    const { basics, education, experience, applicationPreferences } = profile;
    let filledFields = 0;
    let resumeUploadDetected = false;

    // Get all input elements
    const inputs = document.querySelectorAll('input, textarea, select');
    const filledElements = new Set();

    // Track if we found separate first/last name fields
    let hasFirstName = false;
    let hasLastName = false;

    // First pass: detect if we have separate name fields
    inputs.forEach(input => {
      const fieldType = detectFieldType(input);
      if (fieldType === 'firstName') hasFirstName = true;
      if (fieldType === 'lastName') hasLastName = true;
    });

    // Second pass: fill fields
    inputs.forEach(input => {
      if (filledElements.has(input)) return;
      if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') return;
      if (input.disabled || input.readOnly) return;

      const fieldType = detectFieldType(input);
      if (!fieldType) return;

      let value = null;

      switch (fieldType) {
        // Basic info
        case 'firstName':
          value = basics.firstName;
          break;
        case 'lastName':
          value = basics.lastName;
          break;
        case 'fullName':
          if (!hasFirstName && !hasLastName) {
            value = `${basics.firstName || ''} ${basics.lastName || ''}`.trim();
          }
          break;
        case 'email':
          value = basics.email;
          break;
        case 'phone':
          value = basics.phone;
          break;
        case 'linkedin':
          value = basics.linkedin;
          break;
        case 'github':
          value = basics.github;
          break;
        case 'website':
          value = basics.website;
          break;
        case 'location':
          value = basics.location;
          break;
        // Experience
        case 'company':
          if (experience && experience.length > 0) {
            value = experience[0].company;
          }
          break;
        case 'title':
          if (experience && experience.length > 0) {
            value = experience[0].title;
          }
          break;
        // Education
        case 'school':
          if (education && education.length > 0) {
            value = education[0].institution;
          }
          break;
        case 'degree':
          if (education && education.length > 0) {
            value = education[0].degree;
          }
          break;
        case 'major':
          if (education && education.length > 0) {
            value = education[0].field;
          }
          break;
        case 'gpa':
          if (education && education.length > 0 && education[0].gpa) {
            value = education[0].gpa;
          }
          break;
        // Application preferences
        case 'jobSource':
          value = applicationPreferences?.jobSource || 'LinkedIn';
          break;
        case 'salary':
          value = applicationPreferences?.desiredSalary;
          break;
        case 'startDate':
          value = applicationPreferences?.availableStartDate;
          break;
        case 'gender':
          value = applicationPreferences?.gender;
          break;
        case 'ethnicity':
          value = applicationPreferences?.ethnicity;
          break;
        case 'veteran':
          value = applicationPreferences?.veteranStatus;
          break;
        case 'disability':
          value = applicationPreferences?.disabilityStatus;
          break;
      }

      // Handle boolean/yes-no fields
      if (fieldType === 'authorized' && applicationPreferences) {
        value = applicationPreferences.isAuthorizedToWork ? 'Yes' : 'No';
      }
      if (fieldType === 'sponsorship' && applicationPreferences) {
        value = applicationPreferences.requiresSponsorship ? 'Yes' : 'No';
      }
      if (fieldType === 'relocate' && applicationPreferences) {
        value = applicationPreferences.willingToRelocate ? 'Yes' : 'No';
      }
      if (fieldType === 'over18' && applicationPreferences) {
        value = applicationPreferences.isOver18 ? 'Yes' : 'No';
      }

      if (value) {
        const filled = fillInput(input, value, fieldType, applicationPreferences);
        if (filled) {
          filledElements.add(input);
          filledFields++;
        }
      }
    });

    // Handle file upload fields
    const resumeFiles = profile.resumeFiles || [];
    if (resumeFiles.length > 0) {
      const uploaded = handleResumeUpload(profile, selectedResumeId);
      if (uploaded) {
        resumeUploadDetected = true;
        filledFields++;
      }
    }

    return { success: true, filledFields, resumeUploadDetected };
  } catch (error) {
    console.error('Fill error:', error);
    return { success: false, error: error.message };
  }
}

// Detect field type based on various attributes
function detectFieldType(element) {
  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
  const autocomplete = (element.autocomplete || '').toLowerCase();

  let labelText = '';
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      labelText = label.textContent.toLowerCase();
    }
  }

  const parentLabel = element.closest('label');
  if (parentLabel) {
    labelText += ' ' + parentLabel.textContent.toLowerCase();
  }

  // Get parent container text for context
  const parent = element.closest('div, fieldset, section');
  let parentText = '';
  if (parent) {
    const parentLabelEl = parent.querySelector('label, legend, h3, h4, .label');
    if (parentLabelEl) {
      parentText = parentLabelEl.textContent.toLowerCase();
    }
  }

  const dataField = (element.dataset.field || '').toLowerCase();
  const dataName = (element.dataset.name || '').toLowerCase();

  const searchText = `${name} ${id} ${placeholder} ${ariaLabel} ${labelText} ${dataField} ${dataName} ${autocomplete} ${parentText}`;

  // Check for email type first
  if (element.type === 'email') {
    return 'email';
  }

  // Check for phone type
  if (element.type === 'tel') {
    return 'phone';
  }

  // Check autocomplete attribute
  if (autocomplete) {
    if (autocomplete === 'given-name') return 'firstName';
    if (autocomplete === 'family-name') return 'lastName';
    if (autocomplete === 'name') return 'fullName';
    if (autocomplete === 'email') return 'email';
    if (autocomplete === 'tel') return 'phone';
    if (autocomplete === 'url') return 'website';
    if (autocomplete === 'organization') return 'company';
    if (autocomplete === 'address-level2') return 'location';
  }

  // Check patterns for each field type
  for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      const regex = new RegExp(`(^|[^a-z])${pattern}([^a-z]|$)`, 'i');
      if (regex.test(searchText)) {
        if (fieldType === 'fullName') {
          if (searchText.includes('first') || searchText.includes('last') ||
              searchText.includes('given') || searchText.includes('family')) {
            continue;
          }
        }
        return fieldType;
      }
    }
  }

  return null;
}

// Fill an input element and trigger events
function fillInput(element, value, fieldType, prefs) {
  if (element.tagName === 'SELECT') {
    return fillSelect(element, value, fieldType);
  } else if (element.type === 'checkbox') {
    return fillCheckbox(element, value, fieldType, prefs);
  } else if (element.type === 'radio') {
    return fillRadio(element, value, fieldType);
  } else {
    element.value = value;
    triggerInputEvents(element);
    return true;
  }
}

// Fill select elements
function fillSelect(select, value, fieldType) {
  const valueLower = (value || '').toLowerCase();

  // For yes/no type fields
  if (['authorized', 'sponsorship', 'relocate', 'over18'].includes(fieldType)) {
    const isYes = valueLower === 'yes';
    for (const option of select.options) {
      const optionText = option.text.toLowerCase();
      const optionValue = option.value.toLowerCase();
      if (isYes && (optionText.includes('yes') || optionValue === 'yes' || optionValue === 'true' || optionValue === '1')) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
      if (!isYes && (optionText.includes('no') || optionValue === 'no' || optionValue === 'false' || optionValue === '0')) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
  }

  // For job source - always try LinkedIn first
  if (fieldType === 'jobSource') {
    for (const option of select.options) {
      const optionText = option.text.toLowerCase();
      if (optionText.includes('linkedin')) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
  }

  // General matching
  for (const option of select.options) {
    const optionText = option.text.toLowerCase();
    const optionValue = option.value.toLowerCase();

    if (optionText.includes(valueLower) || optionValue.includes(valueLower) ||
        valueLower.includes(optionText) || valueLower.includes(optionValue)) {
      select.value = option.value;
      triggerInputEvents(select);
      return true;
    }
  }

  return false;
}

// Fill checkbox
function fillCheckbox(checkbox, value, fieldType, prefs) {
  const shouldCheck = value === 'Yes' || value === true || value === 'true';

  // Get label text for context
  let labelText = '';
  if (checkbox.id) {
    const label = document.querySelector(`label[for="${checkbox.id}"]`);
    if (label) labelText = label.textContent.toLowerCase();
  }
  const parentLabel = checkbox.closest('label');
  if (parentLabel) labelText += ' ' + parentLabel.textContent.toLowerCase();

  // Handle specific field types
  if (fieldType === 'authorized' && labelText.includes('authorized')) {
    checkbox.checked = prefs?.isAuthorizedToWork ?? true;
    triggerInputEvents(checkbox);
    return true;
  }
  if (fieldType === 'sponsorship' && (labelText.includes('sponsor') || labelText.includes('visa'))) {
    checkbox.checked = prefs?.requiresSponsorship ?? false;
    triggerInputEvents(checkbox);
    return true;
  }
  if (fieldType === 'relocate' && labelText.includes('relocat')) {
    checkbox.checked = prefs?.willingToRelocate ?? false;
    triggerInputEvents(checkbox);
    return true;
  }
  if (fieldType === 'over18' && (labelText.includes('18') || labelText.includes('age'))) {
    checkbox.checked = prefs?.isOver18 ?? true;
    triggerInputEvents(checkbox);
    return true;
  }

  checkbox.checked = shouldCheck;
  triggerInputEvents(checkbox);
  return true;
}

// Fill radio button
function fillRadio(radio, value, fieldType) {
  const radioValue = radio.value.toLowerCase();
  const valueLower = (value || '').toLowerCase();

  // For yes/no fields
  if (['authorized', 'sponsorship', 'relocate', 'over18'].includes(fieldType)) {
    const isYes = valueLower === 'yes';
    if ((isYes && (radioValue === 'yes' || radioValue === 'true' || radioValue === '1')) ||
        (!isYes && (radioValue === 'no' || radioValue === 'false' || radioValue === '0'))) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
  }

  // General matching
  if (radioValue.includes(valueLower) || valueLower.includes(radioValue)) {
    radio.checked = true;
    triggerInputEvents(radio);
    return true;
  }

  return false;
}

// Trigger events
function triggerInputEvents(element) {
  element.focus();

  const inputEvent = new Event('input', { bubbles: true, cancelable: true });
  element.dispatchEvent(inputEvent);

  const changeEvent = new Event('change', { bubbles: true, cancelable: true });
  element.dispatchEvent(changeEvent);

  // React compatibility
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;

  if (element.tagName === 'INPUT' && nativeInputValueSetter && element.type !== 'checkbox' && element.type !== 'radio') {
    nativeInputValueSetter.call(element, element.value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(element, element.value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

// Handle resume upload
function handleResumeUpload(profile, selectedResumeId) {
  const resumeFiles = profile.resumeFiles || [];
  const selectedResume = resumeFiles.find(r => r.id === selectedResumeId) || resumeFiles[0];

  if (!selectedResume) return false;

  let uploaded = false;

  // Try standard file inputs first
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    if (input.dataset.simplerfyFilled) return;

    if (isResumeUpload(input)) {
      const success = uploadFile(input, selectedResume);
      if (success) {
        input.dataset.simplerfyFilled = 'true';
        uploaded = true;
      }
    }
  });

  // Also try drag-and-drop zones
  if (!uploaded) {
    const dropZones = findDropZones();
    dropZones.forEach(zone => {
      if (zone.dataset.simplerfyFilled) return;

      const success = simulateDrop(zone, selectedResume);
      if (success) {
        zone.dataset.simplerfyFilled = 'true';
        uploaded = true;
      }
    });
  }

  return uploaded;
}

// Find drag-and-drop upload zones
function findDropZones() {
  const dropZones = [];

  // Common selectors for drop zones
  const selectors = [
    '[data-dropzone]',
    '[class*="dropzone"]',
    '[class*="drop-zone"]',
    '[class*="upload-area"]',
    '[class*="file-upload"]',
    '[class*="resume-upload"]',
    '[role="button"][class*="upload"]',
    '.dz-clickable',
    '[class*="drag"]'
  ];

  selectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        const text = el.textContent.toLowerCase();
        if (text.includes('resume') || text.includes('cv') || text.includes('upload') || text.includes('drag')) {
          dropZones.push(el);
        }
      });
    } catch {
      // Invalid selector, skip
    }
  });

  return [...new Set(dropZones)];
}

// Simulate dropping a file on a drop zone
function simulateDrop(dropZone, resume) {
  try {
    // Create file from resume data
    const byteCharacters = atob(resume.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: resume.fileType || 'application/pdf' });
    const file = new File([blob], resume.fileName, {
      type: resume.fileType || 'application/pdf',
      lastModified: Date.now()
    });

    // Create DataTransfer with the file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Simulate drag events
    const dragEnterEvent = new DragEvent('dragenter', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    });
    dropZone.dispatchEvent(dragEnterEvent);

    const dragOverEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    });
    dropZone.dispatchEvent(dragOverEvent);

    // Simulate drop event
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    });
    dropZone.dispatchEvent(dropEvent);

    const dragLeaveEvent = new DragEvent('dragleave', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    });
    dropZone.dispatchEvent(dragLeaveEvent);

    console.log('Simplerfy: Simulated drop on zone:', dropZone);

    // Also check if there's a hidden file input inside
    const hiddenInput = dropZone.querySelector('input[type="file"]');
    if (hiddenInput) {
      try {
        hiddenInput.files = dataTransfer.files;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      } catch {
        // Ignore if can't set
      }
    }

    showUploadSuccess(dropZone, resume.fileName);
    return true;
  } catch (error) {
    console.error('Simplerfy: Drop simulation failed:', error);
    return false;
  }
}

// Check if file input is for resume
function isResumeUpload(input) {
  const name = (input.name || '').toLowerCase();
  const id = (input.id || '').toLowerCase();
  const accept = (input.accept || '').toLowerCase();

  if (accept.includes('pdf') || accept.includes('doc') || accept === '' || accept === '*/*' || accept.includes('application')) {
    const searchText = `${name} ${id}`;

    let nearbyText = '';
    const parent = input.closest('div, label, section, fieldset');
    if (parent) {
      nearbyText = parent.textContent.toLowerCase();
    }

    const combinedText = `${searchText} ${nearbyText}`;
    return combinedText.includes('resume') || combinedText.includes('cv') ||
           combinedText.includes('curriculum') || combinedText.includes('upload');
  }

  return false;
}

// Upload file to input using DataTransfer API
function uploadFile(fileInput, resume) {
  try {
    // Convert base64 to blob
    const byteCharacters = atob(resume.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: resume.fileType || 'application/pdf' });

    // Create File object
    const file = new File([blob], resume.fileName, {
      type: resume.fileType || 'application/pdf',
      lastModified: Date.now()
    });

    // Use DataTransfer to set files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Try to set files directly
    try {
      fileInput.files = dataTransfer.files;
    } catch {
      console.log('Direct assignment failed, trying alternative method');
    }

    // Verify the file was set
    if (fileInput.files.length === 0) {
      throw new Error('Failed to set files on input');
    }

    // Create and dispatch events that React and other frameworks listen for
    // Focus the input first
    fileInput.focus();

    // Dispatch native change event
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    Object.defineProperty(changeEvent, 'target', { writable: false, value: fileInput });
    fileInput.dispatchEvent(changeEvent);

    // Dispatch input event
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    fileInput.dispatchEvent(inputEvent);

    // For React 16+, we need to trigger the native event handler
    // React uses a synthetic event system that listens at the document level
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'files'
    );
    if (nativeInputValueSetter && nativeInputValueSetter.set) {
      nativeInputValueSetter.set.call(fileInput, dataTransfer.files);
    }

    // Dispatch a custom event that some frameworks might listen for
    fileInput.dispatchEvent(new CustomEvent('filechange', {
      bubbles: true,
      detail: { files: dataTransfer.files }
    }));

    // Try triggering React's onChange by simulating user interaction
    const reactHandler = fileInput._valueTracker;
    if (reactHandler) {
      reactHandler.setValue('');
    }
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Also try dispatching on the form if there is one
    const form = fileInput.closest('form');
    if (form) {
      form.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Blur to finalize
    fileInput.dispatchEvent(new Event('blur', { bubbles: true }));

    // Verify upload worked by checking if files are set
    // Some sites might clear it immediately, so we use a small delay to check
    setTimeout(() => {
      if (fileInput.files.length === 0) {
        console.log('Simplerfy: File was cleared by site, showing manual upload notice');
        showManualUploadNotice(fileInput, resume);
      }
    }, 100);

    // Add visual indicator
    showUploadSuccess(fileInput, resume.fileName);

    console.log('Simplerfy: Uploaded resume:', resume.fileName, 'Files set:', fileInput.files.length);
    return true;
  } catch (error) {
    console.error('Simplerfy: Failed to upload file:', error);
    // Fallback: show notice for manual upload
    showManualUploadNotice(fileInput, resume);
    return false;
  }
}

// Show success indicator near file input
function showUploadSuccess(input, fileName) {
  // Remove any existing notices
  const existingNotice = input.parentNode.querySelector('.simplerfy-notice');
  if (existingNotice) existingNotice.remove();

  const notice = document.createElement('div');
  notice.className = 'simplerfy-notice';
  notice.style.cssText = `
    background: #ecfdf5;
    border: 1px solid #10b981;
    border-radius: 8px;
    padding: 10px 12px;
    margin: 8px 0;
    font-size: 13px;
    color: #065f46;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  notice.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    <span><strong>Simplerfy:</strong> Uploaded ${fileName}</span>
  `;

  input.parentNode.insertBefore(notice, input.nextSibling);
}

// Show manual upload notice if auto-upload fails
function showManualUploadNotice(input, resume) {
  const existingNotice = input.parentNode.querySelector('.simplerfy-notice');
  if (existingNotice) existingNotice.remove();

  // Auto-download the resume file
  downloadResume(resume);

  const notice = document.createElement('div');
  notice.className = 'simplerfy-notice';
  notice.style.cssText = `
    background: #dbeafe;
    border: 1px solid #2563eb;
    border-radius: 8px;
    padding: 12px;
    margin: 8px 0;
    font-size: 13px;
    color: #1e40af;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  notice.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 10px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <div>
        <strong>Simplerfy downloaded: ${resume.fileName}</strong><br>
        <span style="font-size: 12px;">Drag it from your downloads to the upload area above, or click the upload button and select it.</span>
        <button id="simplerfy-redownload-${resume.id}" style="display: block; margin-top: 6px; color: #2563eb; background: none; border: none; text-decoration: underline; cursor: pointer; font-size: 12px; padding: 0;">
          Download again
        </button>
      </div>
    </div>
  `;

  input.parentNode.insertBefore(notice, input.nextSibling);

  // Add re-download handler
  document.getElementById(`simplerfy-redownload-${resume.id}`)?.addEventListener('click', () => {
    downloadResume(resume);
  });
}

// Download resume file
function downloadResume(resume) {
  const byteCharacters = atob(resume.fileData);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: resume.fileType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = resume.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

console.log('Simplerfy content script loaded');
