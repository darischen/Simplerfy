// Content script for Simplerfy extension
// Handles form detection and autofill on job application pages

// Field patterns for detecting form inputs
const FIELD_PATTERNS = {
  firstName: ['first_name', 'firstname', 'first-name', 'fname', 'given_name', 'givenname', 'first'],
  lastName: ['last_name', 'lastname', 'last-name', 'lname', 'family_name', 'familyname', 'surname', 'last'],
  fullName: ['full_name', 'fullname', 'name', 'your_name', 'yourname', 'applicant_name', 'candidate_name'],
  email: ['email', 'e-mail', 'email_address', 'emailaddress', 'e_mail'],
  phone: ['phone', 'telephone', 'mobile', 'cell', 'phone_number', 'phonenumber', 'tel', 'contact_number'],
  phoneExtension: ['phone_ext', 'phoneext', 'extension', 'ext', 'phone_extension'],
  linkedin: ['linkedin', 'linked_in', 'linkedin_url', 'linkedinurl', 'linkedin_profile'],
  github: ['github', 'git_hub', 'github_url', 'githuburl', 'github_profile'],
  website: ['website', 'portfolio', 'personal_site', 'personalsite', 'url', 'personal_website', 'homepage'],
  // Address fields - order matters, more specific patterns first
  city: ['city', 'town', 'locality', 'city_name', 'cityname'],
  state: ['state', 'province', 'administrative_area', 'state_province', 'state_region', 'stateprovince', 'addressstate', 'address_state', 'addressregion', 'address_region', 'region', 'countryregion', 'country_region', 'stateprovincecode', 'state_code', 'statecode'],
  zipCode: ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postalcode'],
  country: ['country', 'nation', 'country_name'],
  streetAddress2: ['address_line_2', 'address2', 'addressline2', 'apt', 'suite', 'unit', 'apartment', 'address_2', 'line2', 'line_2'],
  streetAddress: ['street_address', 'streetaddress', 'street', 'address_line_1', 'address1', 'addressline1', 'address_line1', 'line1', 'line_1', 'address_1'],
  // Experience
  company: ['company', 'employer', 'organization', 'current_company', 'currentcompany', 'current_employer'],
  title: ['title', 'position', 'job_title', 'jobtitle', 'current_title', 'currenttitle', 'role'],
  // Education
  school: ['school', 'university', 'college', 'institution', 'education', 'alma_mater'],
  degree: ['degree', 'diploma', 'qualification'],
  major: ['major', 'field_of_study', 'fieldofstudy', 'concentration', 'specialization', 'field'],
  gpa: ['gpa', 'grade', 'grade_point', 'gradepoint', 'cgpa'],
  // Application preference patterns
  jobSource: ['hear_about', 'how_did_you_hear', 'source', 'referral_source', 'job_source', 'found_us', 'hear_about_us', 'how_heard', 'where_did_you', 'how_did_you_find', 'learn_about', 'discover', 'referred', 'recruiting_source', 'howdidyouhear', 'sourceofhire', 'job_board', 'jobboard'],
  authorized: ['authorized', 'authorised', 'legally_authorized', 'work_authorization', 'eligible_to_work', 'legally_eligible'],
  sponsorship: ['sponsor', 'visa', 'sponsorship', 'require_sponsor', 'need_visa', 'immigration'],
  relocate: ['relocate', 'relocation', 'willing_to_relocate', 'open_to_relocation'],
  over18: ['18', 'age', 'years_old', 'legal_age', 'eighteen', 'adult'],
  salary: ['salary', 'compensation', 'pay', 'desired_salary', 'expected_salary', 'salary_expectation'],
  startDate: ['start_date', 'available', 'availability', 'when_can_you_start', 'earliest_start'],
  gender: ['gender', 'sex'],
  ethnicity: ['ethnicity', 'race', 'ethnic', 'racial'],
  veteran: ['veteran', 'military', 'protected_veteran'],
  disability: ['disability', 'disabled', 'handicap'],
  citizenship: ['citizenship', 'citizen', 'nationality'],
  // Questions that should always be "No"
  previouslyEmployed: ['previously_employed', 'worked_here_before', 'former_employee', 'worked_for_this_company', 'employed_by_this_company', 'worked_at_this_company', 'previously_worked'],
  governmentEmployee: ['government', 'federal_employee', 'us_government', 'federal_government', 'government_employee', 'employed_by_government', 'work_for_government']
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

      // Debug logging for address fields
      if (['streetAddress', 'city', 'state', 'zipCode', 'country'].includes(fieldType)) {
        console.log(`Simplerfy: Detected ${fieldType} field:`, input.name || input.id, input.tagName);
      }

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
        // Address fields
        case 'streetAddress':
          value = basics.streetAddress;
          break;
        case 'streetAddress2':
          value = basics.streetAddress2;
          break;
        case 'city':
          value = basics.city;
          break;
        case 'state':
          value = basics.state;
          console.log('Simplerfy: State value from profile:', value);
          break;
        case 'zipCode':
          value = basics.zipCode;
          break;
        case 'country':
          value = basics.country;
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
        case 'citizenship':
          value = applicationPreferences?.citizenship;
          break;
        // Questions that should always be "No"
        case 'previouslyEmployed':
        case 'governmentEmployee':
          value = 'No';
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

    // Special pass for job source fields (Workday and other custom forms)
    const jobSourceFilled = handleJobSourceFields();
    if (jobSourceFilled) {
      filledFields++;
    }

    // Special pass for state fields that might have been missed
    const stateFilled = handleStateFields(basics.state);
    if (stateFilled) {
      filledFields++;
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

  // Check for phone type (but not phone extension)
  if (element.type === 'tel') {
    // Skip phone extension fields
    if (searchText.includes('ext') || searchText.includes('extension')) {
      return null;
    }
    return 'phone';
  }

  // Check autocomplete attribute for address fields
  if (autocomplete) {
    if (autocomplete === 'given-name') return 'firstName';
    if (autocomplete === 'family-name') return 'lastName';
    if (autocomplete === 'name') return 'fullName';
    if (autocomplete === 'email') return 'email';
    if (autocomplete === 'tel') return 'phone';
    if (autocomplete === 'url') return 'website';
    if (autocomplete === 'organization') return 'company';
    if (autocomplete === 'street-address' || autocomplete === 'address-line1') return 'streetAddress';
    if (autocomplete === 'address-line2') return 'streetAddress2';
    if (autocomplete === 'address-level2') return 'city';
    if (autocomplete === 'address-level1') return 'state';
    if (autocomplete === 'postal-code') return 'zipCode';
    if (autocomplete === 'country' || autocomplete === 'country-name') return 'country';
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
        // Don't confuse street address with streetAddress2
        if (fieldType === 'streetAddress') {
          if (searchText.includes('line_2') || searchText.includes('line2') ||
              searchText.includes('address2') || searchText.includes('apt') ||
              searchText.includes('suite') || searchText.includes('unit')) {
            continue;
          }
        }
        // Don't fill phone extension fields
        if (fieldType === 'phone') {
          if (searchText.includes('ext') || searchText.includes('extension')) {
            continue;
          }
        }
        // Skip phoneExtension - we don't want to fill it
        if (fieldType === 'phoneExtension') {
          return null;
        }
        // Don't match streetAddress if this is actually a city, state, zip, or country field
        if (fieldType === 'streetAddress') {
          if (searchText.includes('city') || searchText.includes('town') ||
              searchText.includes('state') || searchText.includes('province') ||
              searchText.includes('zip') || searchText.includes('postal') ||
              searchText.includes('country') || searchText.includes('region')) {
            continue;
          }
        }
        // For state field - skip only if it clearly says "united states" or "statement"
        if (fieldType === 'state') {
          const immediateContext = `${name} ${id} ${placeholder} ${ariaLabel}`;
          // Only skip if the immediate field context (not label) contains these
          if (immediateContext.includes('statement') || immediateContext.includes('stated')) {
            continue;
          }
          // Skip if it's clearly a country field asking for "United States"
          if (immediateContext.includes('unitedstates') || immediateContext.includes('united_states')) {
            continue;
          }
        }
        // Don't match country if immediate context says state/province
        if (fieldType === 'country') {
          const immediateContext = `${name} ${id} ${placeholder} ${ariaLabel}`;
          if (immediateContext.includes('state') || immediateContext.includes('province')) {
            continue;
          }
        }
        return fieldType;
      }
    }
  }

  return null;
}

// Get label text for an element
function getLabelText(element) {
  let labelText = '';
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) labelText = label.textContent.toLowerCase();
  }
  const parentLabel = element.closest('label');
  if (parentLabel) labelText += ' ' + parentLabel.textContent.toLowerCase();

  // Also check parent container for context
  const parent = element.closest('div, fieldset, section, li');
  if (parent) {
    const parentLabelEl = parent.querySelector('label, legend, h3, h4, .label, span');
    if (parentLabelEl) {
      labelText += ' ' + parentLabelEl.textContent.toLowerCase();
    }
  }
  return labelText;
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

// US State abbreviations to full names mapping
const STATE_MAP = {
  'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
  'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
  'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
  'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
  'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi', 'mo': 'missouri',
  'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'new hampshire', 'nj': 'new jersey',
  'nm': 'new mexico', 'ny': 'new york', 'nc': 'north carolina', 'nd': 'north dakota', 'oh': 'ohio',
  'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania', 'ri': 'rhode island', 'sc': 'south carolina',
  'sd': 'south dakota', 'tn': 'tennessee', 'tx': 'texas', 'ut': 'utah', 'vt': 'vermont',
  'va': 'virginia', 'wa': 'washington', 'wv': 'west virginia', 'wi': 'wisconsin', 'wy': 'wyoming',
  'dc': 'district of columbia'
};

// Reverse map: full name to abbreviation
const STATE_REVERSE_MAP = Object.fromEntries(Object.entries(STATE_MAP).map(([k, v]) => [v, k]));

// Fill select elements (dropdowns)
function fillSelect(select, value, fieldType) {
  const valueLower = (value || '').toLowerCase().trim();

  // For state fields - handle abbreviations and full names
  if (fieldType === 'state' && valueLower) {
    // Get both abbreviation and full name
    const stateAbbrev = STATE_REVERSE_MAP[valueLower] || valueLower;
    const stateFull = STATE_MAP[valueLower] || valueLower;
    console.log('Simplerfy: Filling state dropdown, looking for:', valueLower, stateAbbrev, stateFull);
    console.log('Simplerfy: Available options:', Array.from(select.options).map(o => o.text + '=' + o.value));

    for (const option of select.options) {
      const optionText = (option.text || '').toLowerCase().trim();
      const optionValue = (option.value || '').toLowerCase().trim();

      // Match abbreviation (exact or at start like "CA" or "CA -")
      if (optionValue === stateAbbrev || optionText === stateAbbrev ||
          optionValue.startsWith(stateAbbrev + ' ') || optionText.startsWith(stateAbbrev + ' ') ||
          optionValue.startsWith(stateAbbrev + '-') || optionText.startsWith(stateAbbrev + '-')) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }

      // Match full name
      if (optionValue === stateFull || optionText === stateFull ||
          optionValue.includes(stateFull) || optionText.includes(stateFull)) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }

      // Match the original value as-is
      if (optionValue === valueLower || optionText === valueLower ||
          optionValue.includes(valueLower) || optionText.includes(valueLower)) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
  }

  // For job source - always try to select option containing "linkedin" (case insensitive)
  if (fieldType === 'jobSource') {
    for (const option of select.options) {
      const optionText = (option.text || '').toLowerCase();
      const optionValue = (option.value || '').toLowerCase();
      const optionLabel = (option.label || '').toLowerCase();
      // Check if any part contains "linkedin"
      if (optionText.indexOf('linkedin') !== -1 ||
          optionValue.indexOf('linkedin') !== -1 ||
          optionLabel.indexOf('linkedin') !== -1) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
  }

  // For questions that should always be "No"
  if (fieldType === 'previouslyEmployed' || fieldType === 'governmentEmployee') {
    for (const option of select.options) {
      const optionText = option.text.toLowerCase();
      const optionValue = option.value.toLowerCase();
      if (optionText.includes('no') || optionValue === 'no' || optionValue === 'false' || optionValue === '0') {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
  }

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
  // Questions that should always be "No" (unchecked)
  if (fieldType === 'previouslyEmployed' || fieldType === 'governmentEmployee') {
    checkbox.checked = false;
    triggerInputEvents(checkbox);
    return true;
  }

  // Handle specific field types
  if (fieldType === 'authorized') {
    checkbox.checked = prefs?.isAuthorizedToWork ?? true;
    triggerInputEvents(checkbox);
    return true;
  }
  if (fieldType === 'sponsorship') {
    checkbox.checked = prefs?.requiresSponsorship ?? false;
    triggerInputEvents(checkbox);
    return true;
  }
  if (fieldType === 'relocate') {
    checkbox.checked = prefs?.willingToRelocate ?? false;
    triggerInputEvents(checkbox);
    return true;
  }
  if (fieldType === 'over18') {
    checkbox.checked = prefs?.isOver18 ?? true;
    triggerInputEvents(checkbox);
    return true;
  }

  const shouldCheck = value === 'Yes' || value === true || value === 'true';
  checkbox.checked = shouldCheck;
  triggerInputEvents(checkbox);
  return true;
}

// Fill radio button
function fillRadio(radio, value, fieldType) {
  const radioValue = (radio.value || '').toLowerCase();
  const valueLower = (value || '').toLowerCase();
  const labelText = getLabelText(radio);

  // For job source - always select option containing "linkedin" (case insensitive)
  if (fieldType === 'jobSource') {
    if (radioValue.indexOf('linkedin') !== -1 || labelText.indexOf('linkedin') !== -1) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
    return false;
  }

  // Questions that should always be "No"
  if (fieldType === 'previouslyEmployed' || fieldType === 'governmentEmployee') {
    if (radioValue === 'no' || radioValue === 'false' || radioValue === '0' ||
        labelText.includes('no') && !labelText.includes('yes')) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
    return false;
  }

  // For yes/no fields
  if (['authorized', 'sponsorship', 'relocate', 'over18'].includes(fieldType)) {
    const isYes = valueLower === 'yes';
    const radioLabelIsYes = labelText.includes('yes') && !labelText.includes('no');
    const radioLabelIsNo = labelText.includes('no') && !labelText.includes('yes');

    if (isYes && (radioValue === 'yes' || radioValue === 'true' || radioValue === '1' || radioLabelIsYes)) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
    if (!isYes && (radioValue === 'no' || radioValue === 'false' || radioValue === '0' || radioLabelIsNo)) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
    return false;
  }

  // For EEO fields like gender, ethnicity, veteran, disability
  if (['gender', 'ethnicity', 'veteran', 'disability'].includes(fieldType)) {
    if (radioValue.includes(valueLower) || valueLower.includes(radioValue) ||
        labelText.includes(valueLower)) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
    return false;
  }

  // General matching
  if (radioValue.includes(valueLower) || valueLower.includes(radioValue) ||
      labelText.includes(valueLower)) {
    radio.checked = true;
    triggerInputEvents(radio);
    return true;
  }

  return false;
}

// Special handler for state fields that might have been missed
function handleStateFields(stateValue) {
  if (!stateValue) return false;

  const stateLower = stateValue.toLowerCase().trim();
  const stateAbbrev = STATE_REVERSE_MAP[stateLower] || stateLower;
  const stateFull = STATE_MAP[stateLower] || stateLower;

  let filled = false;

  // Look for select elements that might be state fields
  document.querySelectorAll('select').forEach(select => {
    if (select.dataset.simplerfyState || select.value) return; // Already filled or has value

    const name = (select.name || '').toLowerCase();
    const id = (select.id || '').toLowerCase();
    const ariaLabel = (select.getAttribute('aria-label') || '').toLowerCase();

    // Get nearby text for context
    const parent = select.closest('div, fieldset, label');
    const nearbyText = parent ? parent.textContent.toLowerCase() : '';

    // Check if this looks like a state field
    const isStateField = name.includes('state') || name.includes('province') || name.includes('region') ||
                         id.includes('state') || id.includes('province') || id.includes('region') ||
                         ariaLabel.includes('state') || ariaLabel.includes('province') ||
                         (nearbyText.includes('state') && !nearbyText.includes('united states'));

    if (isStateField) {
      // Try to find matching option
      for (const option of select.options) {
        const optionText = (option.text || '').toLowerCase().trim();
        const optionValue = (option.value || '').toLowerCase().trim();

        if (optionValue === stateAbbrev || optionText === stateAbbrev ||
            optionValue === stateFull || optionText === stateFull ||
            optionText.includes(stateFull) || optionValue.includes(stateFull) ||
            optionText.startsWith(stateAbbrev + ' ') || optionText.startsWith(stateAbbrev + '-') ||
            optionValue === stateLower || optionText === stateLower) {
          select.value = option.value;
          triggerInputEvents(select);
          select.dataset.simplerfyState = 'true';
          filled = true;
          console.log('Simplerfy: Found state dropdown in special pass, selected:', option.text);
          break;
        }
      }
    }
  });

  // Look for text inputs that might be state fields
  document.querySelectorAll('input[type="text"], input:not([type])').forEach(input => {
    if (input.dataset.simplerfyState || input.value) return;

    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();

    const parent = input.closest('div, fieldset, label');
    const nearbyText = parent ? parent.textContent.toLowerCase() : '';

    const isStateField = name.includes('state') || name.includes('province') || name.includes('region') ||
                         id.includes('state') || id.includes('province') || id.includes('region') ||
                         ariaLabel.includes('state') || ariaLabel.includes('province') ||
                         placeholder.includes('state') || placeholder.includes('province') ||
                         (nearbyText.includes('state') && !nearbyText.includes('united states'));

    if (isStateField) {
      input.value = stateValue;
      triggerInputEvents(input);
      input.dataset.simplerfyState = 'true';
      filled = true;
      console.log('Simplerfy: Found state text input in special pass, filled:', stateValue);
    }
  });

  // Handle Workday custom dropdowns (they use buttons and listboxes instead of native select)
  // Look for elements with state-related data-automation-id or aria-label
  const stateKeywords = ['state', 'province', 'region'];
  document.querySelectorAll('[data-automation-id*="state"], [data-automation-id*="State"], [data-automation-id*="province"], [data-automation-id*="Province"], [data-automation-id*="region"], [aria-label*="state"], [aria-label*="State"], [aria-label*="province"]').forEach(element => {
    if (element.dataset.simplerfyState) return;

    // Skip if this is a country field or "united states" context
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
    const automationId = (element.getAttribute('data-automation-id') || '').toLowerCase();
    if (ariaLabel.includes('country') || ariaLabel.includes('united states') ||
        automationId.includes('country')) {
      return;
    }

    // Check if it's a Workday dropdown button or combobox
    if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'listbox' ||
        element.getAttribute('role') === 'combobox' || element.getAttribute('aria-haspopup')) {
      console.log('Simplerfy: Found Workday state dropdown, clicking to open');
      element.click();

      // Wait for dropdown to open, then look for state option
      setTimeout(() => {
        selectStateFromDropdown(stateAbbrev, stateFull, stateLower, element);
      }, 300);

      element.dataset.simplerfyState = 'pending';
      filled = true;
    }
  });

  // Also check for custom combobox/listbox components by role
  document.querySelectorAll('[role="combobox"], [role="listbox"], [aria-haspopup="listbox"]').forEach(element => {
    if (element.dataset.simplerfyState) return;

    const parent = element.closest('div, fieldset, section, li');
    const nearbyText = parent ? parent.textContent.toLowerCase() : '';
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();

    // Check if this is a state field by looking at nearby text and labels
    const isStateField = stateKeywords.some(keyword =>
      (ariaLabel.includes(keyword) || nearbyText.includes(keyword)) &&
      !nearbyText.includes('united states') && !ariaLabel.includes('country')
    );

    if (isStateField) {
      console.log('Simplerfy: Found custom state combobox, clicking to open');
      element.click();

      setTimeout(() => {
        selectStateFromDropdown(stateAbbrev, stateFull, stateLower, element);
      }, 300);

      element.dataset.simplerfyState = 'pending';
      filled = true;
    }
  });

  return filled;
}

// Helper to select state from an open dropdown
function selectStateFromDropdown(stateAbbrev, stateFull, stateLower, triggerElement) {
  // Look for options in any open listbox/dropdown
  const optionSelectors = [
    '[role="option"]',
    '[role="menuitem"]',
    '[data-automation-id*="option"]',
    '[data-automation-id*="menuItem"]',
    'li[tabindex]'
  ];

  let found = false;

  for (const selector of optionSelectors) {
    if (found) break;

    document.querySelectorAll(selector).forEach(option => {
      if (found) return;

      const optionText = (option.textContent || '').toLowerCase().trim();

      // Match state abbreviation or full name
      if (optionText === stateAbbrev || optionText === stateFull ||
          optionText.includes(stateFull) ||
          optionText.startsWith(stateAbbrev + ' ') || optionText.startsWith(stateAbbrev + '-') ||
          (optionText.length < 5 && optionText.includes(stateAbbrev)) ||
          optionText === stateLower) {
        option.click();
        if (triggerElement) {
          triggerElement.dataset.simplerfyState = 'true';
        }
        found = true;
        console.log('Simplerfy: Selected state from Workday dropdown:', option.textContent);
      }
    });
  }

  // If no option found, try to close the dropdown by clicking elsewhere
  if (!found) {
    console.log('Simplerfy: State not found in dropdown options');
    document.body.click();
  }
}

// Special handler for job source fields (works with Workday and other custom forms)
function handleJobSourceFields() {
  let filled = false;

  // Keywords that indicate a "how did you hear about us" field
  const jobSourceKeywords = ['hear about', 'how did you', 'source', 'find us', 'learn about', 'discover', 'referred', 'recruiting'];

  // Look for all select elements and check their labels/context
  document.querySelectorAll('select').forEach(select => {
    if (select.dataset.simplerfyJobSource) return;

    // Check if this is a job source field by looking at nearby text
    const parent = select.closest('div, fieldset, section, li, label');
    const nearbyText = parent ? parent.textContent.toLowerCase() : '';

    const isJobSource = jobSourceKeywords.some(keyword => nearbyText.includes(keyword));

    if (isJobSource) {
      // Try to find and select LinkedIn option
      for (const option of select.options) {
        const optionText = (option.text || '').toLowerCase();
        const optionValue = (option.value || '').toLowerCase();
        const optionLabel = (option.label || '').toLowerCase();

        if (optionText.indexOf('linkedin') !== -1 ||
            optionValue.indexOf('linkedin') !== -1 ||
            optionLabel.indexOf('linkedin') !== -1) {
          select.value = option.value;
          triggerInputEvents(select);
          select.dataset.simplerfyJobSource = 'true';
          filled = true;
          console.log('Simplerfy: Found job source dropdown, selected LinkedIn');
          break;
        }
      }
    }
  });

  // Look for radio button groups
  const radioGroups = {};
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    const name = radio.name;
    if (name && !radioGroups[name]) {
      radioGroups[name] = [];
    }
    if (name) {
      radioGroups[name].push(radio);
    }
  });

  Object.values(radioGroups).forEach(radios => {
    if (radios[0].dataset.simplerfyJobSource) return;

    // Check if this radio group is a job source field
    const parent = radios[0].closest('div, fieldset, section, li');
    const nearbyText = parent ? parent.textContent.toLowerCase() : '';

    const isJobSource = jobSourceKeywords.some(keyword => nearbyText.includes(keyword));

    if (isJobSource) {
      // Find the LinkedIn option
      for (const radio of radios) {
        const labelText = getLabelText(radio);
        const radioValue = (radio.value || '').toLowerCase();

        if (labelText.indexOf('linkedin') !== -1 || radioValue.indexOf('linkedin') !== -1) {
          radio.checked = true;
          triggerInputEvents(radio);
          radios.forEach(r => r.dataset.simplerfyJobSource = 'true');
          filled = true;
          console.log('Simplerfy: Found job source radio, selected LinkedIn');
          break;
        }
      }
    }
  });

  // Handle Workday custom dropdowns (they use buttons and listboxes)
  document.querySelectorAll('[data-automation-id*="source"], [data-automation-id*="Source"], [aria-label*="hear"], [aria-label*="source"]').forEach(element => {
    if (element.dataset.simplerfyJobSource) return;

    // Check if it's a Workday dropdown button
    if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'listbox' || element.getAttribute('role') === 'combobox') {
      // Click to open the dropdown
      element.click();

      // Wait a bit for dropdown to open, then look for LinkedIn option
      setTimeout(() => {
        const listbox = document.querySelector('[role="listbox"], [data-automation-id="menuItem"]');
        if (listbox) {
          const options = listbox.querySelectorAll('[role="option"], li, [data-automation-id*="option"]');
          options.forEach(option => {
            const optionText = (option.textContent || '').toLowerCase();
            if (optionText.indexOf('linkedin') !== -1) {
              option.click();
              element.dataset.simplerfyJobSource = 'true';
              filled = true;
              console.log('Simplerfy: Found Workday job source dropdown, selected LinkedIn');
            }
          });
        }
      }, 300);
    }
  });

  // Look for custom dropdown/combobox components by aria labels
  document.querySelectorAll('[role="combobox"], [role="listbox"], [aria-haspopup="listbox"]').forEach(element => {
    if (element.dataset.simplerfyJobSource) return;

    const parent = element.closest('div, fieldset, section');
    const nearbyText = parent ? parent.textContent.toLowerCase() : '';
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();

    const isJobSource = jobSourceKeywords.some(keyword =>
      nearbyText.includes(keyword) || ariaLabel.includes(keyword)
    );

    if (isJobSource) {
      // Click to open
      element.click();

      setTimeout(() => {
        // Look for options in any open listbox
        document.querySelectorAll('[role="option"], [role="menuitem"]').forEach(option => {
          const optionText = (option.textContent || '').toLowerCase();
          if (optionText.indexOf('linkedin') !== -1) {
            option.click();
            element.dataset.simplerfyJobSource = 'true';
            filled = true;
            console.log('Simplerfy: Found custom dropdown job source, selected LinkedIn');
          }
        });
      }, 300);
    }
  });

  return filled;
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
