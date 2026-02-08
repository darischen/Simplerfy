// Content script for Simplerfy extension
// Handles form detection and autofill on job application pages

// Expanded field patterns with semantic keywords for universal detection
const FIELD_PATTERNS = {
  firstName: ['first_name', 'firstname', 'first-name', 'fname', 'given_name', 'givenname', 'first name', 'given name'],
  lastName: ['last_name', 'lastname', 'last-name', 'lname', 'family_name', 'familyname', 'surname', 'last name', 'family name'],
  fullName: ['full_name', 'fullname', 'name', 'your_name', 'yourname', 'applicant_name', 'candidate_name', 'full name', 'applicant name'],
  email: ['email', 'e-mail', 'email_address', 'emailaddress', 'e_mail', 'email address'],
  phone: ['phone', 'telephone', 'mobile', 'cell', 'phone_number', 'phonenumber', 'tel', 'contact_number', 'phone number'],
  linkedin: ['linkedin', 'linked_in', 'linkedin_url', 'linkedinurl', 'linkedin_profile', 'linkedin url', 'linkedin profile'],
  github: ['github', 'git_hub', 'github_url', 'githuburl', 'github_profile', 'github url', 'github profile'],
  website: ['website', 'portfolio', 'personal_site', 'personalsite', 'personal_website', 'homepage', 'portfolio url', 'personal url', 'personal site'],
  city: ['city', 'town', 'locality', 'city_name', 'cityname', 'city name'],
  state: ['state', 'province', 'administrative_area', 'state_province', 'state_region', 'stateprovince', 'addressstate', 'address_state', 'addressregion', 'address_region', 'region', 'stateprovincecode', 'state_code', 'statecode', 'state province'],
  zipCode: ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postalcode', 'postal code'],
  country: ['country', 'nation', 'country_name', 'country name'],
  streetAddress2: ['address_line_2', 'address2', 'addressline2', 'apt', 'suite', 'unit', 'apartment', 'address_2', 'line2', 'line_2', 'apartment number'],
  streetAddress: ['street_address', 'streetaddress', 'street', 'address_line_1', 'address1', 'addressline1', 'address_line1', 'line1', 'line_1', 'address_1', 'street address'],
  company: ['company', 'employer', 'organization', 'current_company', 'currentcompany', 'current_employer', 'company name'],
  title: ['title', 'position', 'job_title', 'jobtitle', 'current_title', 'currenttitle', 'job title', 'job position', 'current position'],
  school: ['school', 'university', 'college', 'institution', 'education', 'alma_mater', 'university name', 'school name'],
  degree: ['degree', 'diploma', 'qualification'],
  major: ['major', 'field_of_study', 'fieldofstudy', 'concentration', 'specialization', 'field', 'field of study'],
  gpa: ['gpa', 'grade', 'grade_point', 'gradepoint', 'cgpa', 'gpa score'],
  jobSource: ['hear_about', 'how_did_you_hear', 'source', 'referral_source', 'job_source', 'found_us', 'hear_about_us', 'how_heard', 'where_did_you', 'how_did_you_find', 'learn_about', 'discover', 'referred', 'recruiting_source', 'howdidyouhear', 'sourceofhire', 'job_board', 'jobboard', 'how did you hear', 'recruiting source', 'job source', 'source of hire'],
  authorized: ['authorized', 'authorised', 'legally_authorized', 'work_authorization', 'eligible_to_work', 'legally_eligible', 'unlimited and unrestricted', 'authorized to work', 'work authorization'],
  sponsorship: ['sponsor', 'visa', 'sponsorship', 'require_sponsor', 'need_visa', 'immigration', 'require company assistance', 'require sponsorship', 'need sponsorship', 'visa sponsorship', 'sponsorship required'],
  relocate: ['relocate', 'relocation', 'willing_to_relocate', 'open_to_relocation', 'willing to move', 'open to relocation', 'willing to relocate', 'can you relocate', 'able to relocate'],
  over18: ['18', 'age', 'years_old', 'legal_age', 'eighteen', 'adult', 'over 18', 'at least 18', 'age 18'],
  salary: ['salary', 'compensation', 'pay', 'desired_salary', 'expected_salary', 'salary_expectation', 'salary expectation', 'expected salary'],
  startDate: ['start_date', 'available', 'availability', 'when_can_you_start', 'earliest_start', 'start date', 'available date', 'can you start'],
  gender: ['gender', 'sex'],
  ethnicity: ['ethnicity', 'race', 'ethnic', 'racial'],
  veteran: ['veteran', 'military', 'protected veteran', 'military service', 'served in', 'armed forces', 'discharging veteran', 'veteran status', 'military background'],
  disability: ['disability', 'disabled', 'handicap', 'disability status'],
  citizenship: ['citizenship', 'citizen', 'nationality'],
  previouslyEmployed: ['previously_employed', 'worked_here_before', 'former_employee', 'worked_for_this_company', 'employed_by_this_company', 'worked_at_this_company', 'previously_worked', 'previously employed'],
  governmentEmployee: ['government', 'federal_employee', 'us_government', 'federal_government', 'government_employee', 'employed_by_government', 'work_for_government'],
  dealerPartnerSupplier: ['dealer', 'partner', 'supplier', 'subsidiaries', 'work_for_or_with', 'work_with'],
  restrictiveCovenant: ['restrictive_covenant', 'non-compete', 'noncompete', 'non-solicit', 'nonsolicit', 'confidentiality_agreement', 'limit_or_restrict', 'scope_and_ability', 'restrictive'],
  hybridSchedule: ['hybrid', 'work schedule', 'in the office', 'in office', 'on-site', 'onsite', 'in-person', 'in person', 'days per week', 'days in office', 'commute to', 'working arrangement', 'work arrangement', 'office location', 'flexible schedule', 'flexible work', 'work from home', 'remote'],
  businessTravel: ['travel', 'business travel', 'percent travel', 'travel percentage', 'willing to travel', 'frequent travel', 'travel required'],
  relocAssist: ['relocation assistance', 'relocation support', 'relocation package', 'moving assistance', 'relocation stipend', 'relocation reimbursement', 'relocation benefit', 'relocation allowance', 'we offer relocation', 'company relocation'],
  yearsExp: ['years of experience', 'years of relevant', 'how many years', 'years experience', 'years of exp', 'years exp', 'experience level']
};

// Ethnicity/race aliases for fuzzy matching
const ETHNICITY_ALIASES = {
  'asian': ['asian', 'east asian', 'south asian', 'southeast asian', 'asian american'],
  'white': ['white', 'caucasian', 'european', 'white/caucasian'],
  'black or african american': ['black', 'african american', 'african-american', 'black or african', 'african'],
  'hispanic or latino': ['hispanic', 'latino', 'latina', 'latinx', 'hispanic or latino', 'hispanic/latino'],
  'american indian or alaska native': ['american indian', 'alaska native', 'native american', 'indigenous', 'first nations'],
  'native hawaiian or other pacific islander': ['native hawaiian', 'pacific islander', 'hawaiian', 'polynesian'],
  'two or more races': ['two or more', 'multiracial', 'mixed', 'multiple races', 'biracial', 'multi-racial']
};

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

const STATE_REVERSE_MAP = Object.fromEntries(Object.entries(STATE_MAP).map(([k, v]) => [v, k]));

// Module-level profile storage for async rescans after Hispanic-only questions
let _currentProfile = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ success: true });
    return true;
  }
  if (request.action === 'fill') {
    const result = fillForm(request.profile, request.selectedResumeId);
    sendResponse(result);
  }
  return true;
});

// Main form filling function with instant experience + smart async detection
function fillForm(profile, selectedResumeId) {
  _currentProfile = profile;
  console.log('Simplerfy: fillForm called');
  console.log('Simplerfy: Profile ethnicity value:', profile.applicationPreferences?.ethnicity);
  console.log('Simplerfy: Profile veteran value:', profile.applicationPreferences?.veteranStatus);
  console.log('Simplerfy: Profile gender value:', profile.applicationPreferences?.gender);
  console.log('Simplerfy: Profile disability value:', profile.applicationPreferences?.disabilityStatus);
  console.log('Simplerfy: Profile basics:', profile.basics?.firstName, profile.basics?.lastName);
  try {
    const instantFields = [];
    const asyncFields = [];
    let resumeUploadDetected = false;

    // Get all form inputs
    const inputs = document.querySelectorAll('input, textarea, select');

    // Categorize fields before filling
    inputs.forEach(input => {
      if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') return;
      if (input.disabled || input.readOnly) return;

      const fieldDetection = detectField(input, profile);
      if (!fieldDetection) return;

      // Determine if field needs async handling
      const needsAsync = detectNeedsAsync(input);

      if (needsAsync) {
        asyncFields.push({ input, detection: fieldDetection });
      } else {
        instantFields.push({ input, detection: fieldDetection });
      }
    });

    // Phase 1: Fill instant fields immediately
    let filledInstant = 0;
    instantFields.forEach(({ input, detection }) => {
      if (fillElement(input, detection)) {
        input.dataset.simplerfyFilled = 'true';
        filledInstant++;
      }
    });

    // Phase 2: Fill async fields with staggered timeouts and retries
    const asyncQueues = [[], [], []];  // Three retry attempts
    const asyncDelays = [0, 100, 300];

    asyncFields.forEach(field => {
      asyncQueues[0].push(field);
    });

    asyncDelays.forEach((delay, attempt) => {
      if (asyncQueues[attempt].length === 0) return;

      setTimeout(() => {
        const stillFailing = [];

        asyncQueues[attempt].forEach(({ input, detection }) => {
          if (!fillElement(input, detection)) {
            stillFailing.push({ input, detection });
          } else {
            input.dataset.simplerfyFilled = 'true';
          }
        });

        // Queue failures for next retry
        if (attempt < asyncQueues.length - 1 && stillFailing.length > 0) {
          asyncQueues[attempt + 1].push(...stillFailing);
        }
      }, delay);
    });

    // Phase 3: Re-scan for late-loading fields (EEO sections, etc.)
    [500, 1500].forEach(delay => {
      setTimeout(() => rescanForm(profile), delay);
    });

    // Handle file upload
    const resumeFiles = profile.resumeFiles || [];
    if (resumeFiles.length > 0) {
      const uploaded = handleResumeUpload(profile, selectedResumeId);
      if (uploaded) {
        resumeUploadDetected = true;
      }
    }

    return { success: true, filledFields: filledInstant + asyncFields.length, resumeUploadDetected };
  } catch (error) {
    console.error('Fill error:', error);
    return { success: false, error: error.message };
  }
}

// Re-scan form for late-loading fields (EEO sections often load after initial scan)
function rescanForm(profile) {
  const elements = document.querySelectorAll('input, textarea, select, [role="combobox"], [role="listbox"]');
  elements.forEach(el => {
    if (el.dataset.simplerfyFilled) return;
    if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button' || el.type === 'file') return;
    if (el.disabled || el.readOnly) return;

    const detection = detectField(el, profile);
    if (!detection) return;

    if (fillElement(el, detection)) {
      el.dataset.simplerfyFilled = 'true';
    }
  });
}

// Extract full question text from element by traversing DOM
function getFullQuestionText(element) {
  // 1. Check direct label association
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      const labelText = label.textContent.trim();
      if (labelText.match(/\?$/) || labelText.length < 300) {
        return labelText;
      }
    }
  }

  // 2. Check if element is inside a label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    const labelText = parentLabel.textContent.trim();
    if (labelText.length < 300) return labelText;
  }

  // 3. Traverse up the DOM tree looking for question-like text
  let parent = element.parentElement;
  for (let i = 0; i < 15 && parent; i++) {
    const children = Array.from(parent.children);

    for (const child of children) {
      if (child === element || child.contains(element)) continue;

      const childText = child.textContent.trim();
      // Questions typically end with "?" or start with action verbs
      if (childText.match(/\?$/) || childText.match(/^(do|are|can|will|have|what|how|which|when|would|should|may)\s/i)) {
        if (childText.length > 10 && childText.length < 500) {
          return childText;
        }
      }
    }

    parent = parent.parentElement;
  }

  // Fallback to field context method
  return getFieldContext(element);
}

// Get basic field context (used as fallback)
function getFieldContext(element) {
  let text = '';

  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) text += ' ' + label.textContent.toLowerCase();
  }

  const parentLabel = element.closest('label');
  if (parentLabel) text += ' ' + parentLabel.textContent.toLowerCase();

  let parent = element.parentElement;
  for (let i = 0; i < 5 && parent; i++) {
    for (const child of parent.children) {
      if (child === element || child.contains(element)) continue;
      const tag = child.tagName;
      if (tag === 'LABEL' || tag === 'LEGEND' || tag === 'H3' || tag === 'H4' || tag === 'P') {
        text += ' ' + child.textContent.toLowerCase();
      }
    }
    if (text.trim()) break;
    parent = parent.parentElement;
  }

  return text;
}

// Detect field type with scoring based on question text + element attributes
function detectField(element, profile) {
  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
  const autocomplete = (element.autocomplete || '').toLowerCase();
  const dataField = (element.dataset.field || '').toLowerCase();
  const dataName = (element.dataset.name || '').toLowerCase();

  // Check HTML5 autocomplete attribute first (most reliable)
  if (autocomplete === 'given-name') return { type: 'firstName', value: profile.basics?.firstName };
  if (autocomplete === 'family-name') return { type: 'lastName', value: profile.basics?.lastName };
  if (autocomplete === 'email') return { type: 'email', value: profile.basics?.email };
  if (autocomplete === 'tel') return { type: 'phone', value: profile.basics?.phone };
  if (autocomplete === 'organization') return { type: 'company', value: profile.experience?.[0]?.company };
  if (autocomplete === 'street-address' || autocomplete === 'address-line1') return { type: 'streetAddress', value: profile.basics?.streetAddress };
  if (autocomplete === 'address-line2') return { type: 'streetAddress2', value: profile.basics?.streetAddress2 };
  if (autocomplete === 'address-level2') return { type: 'city', value: profile.basics?.city };
  if (autocomplete === 'address-level1') return { type: 'state', value: profile.basics?.state };
  if (autocomplete === 'postal-code') return { type: 'zipCode', value: profile.basics?.zipCode };
  if (autocomplete === 'country-name' || autocomplete === 'country') return { type: 'country', value: profile.basics?.country };

  // Check email and tel input types
  if (element.type === 'email') return { type: 'email', value: profile.basics?.email };
  if (element.type === 'tel') {
    if (!name.includes('ext') && !id.includes('ext')) {
      return { type: 'phone', value: profile.basics?.phone };
    }
    return null;
  }

  // PRIORITY: Check element's own attributes first (name, id) - these are most reliable
  // This prevents surrounding page text from overriding the field's actual purpose
  const elementAttrs = `${name} ${id} ${dataField} ${dataName}`;
  
  // Direct attribute matches for EEO/demographic fields (Lever uses eeo[race], eeo[gender], etc.)
  if (elementAttrs.includes('race') || elementAttrs.includes('ethnic')) {
    console.log('Simplerfy: Direct ethnicity match from element attributes:', name, id);
    return { type: 'ethnicity', value: profile.applicationPreferences?.ethnicity };
  }
  if (elementAttrs.includes('gender') || elementAttrs.includes('sex')) {
    console.log('Simplerfy: Direct gender match from element attributes:', name, id);
    return { type: 'gender', value: profile.applicationPreferences?.gender };
  }
  if (elementAttrs.includes('veteran')) {
    console.log('Simplerfy: Direct veteran match from element attributes:', name, id);
    return { type: 'veteran', value: profile.applicationPreferences?.veteranStatus || 'I am not a protected veteran' };
  }
  if (elementAttrs.includes('disability') || elementAttrs.includes('disabled')) {
    console.log('Simplerfy: Direct disability match from element attributes:', name, id);
    return { type: 'disability', value: profile.applicationPreferences?.disabilityStatus || 'I do not wish to answer' };
  }
  if (elementAttrs.includes('hispanic') || elementAttrs.includes('latino')) {
    console.log('Simplerfy: Direct Hispanic match from element attributes:', name, id);
    return { type: 'ethnicity', value: profile.applicationPreferences?.ethnicity };
  }

  // Build combined search text: element attributes + question/label text
  const questionText = getFullQuestionText(element).toLowerCase();
  const searchText = `${name} ${id} ${placeholder} ${ariaLabel} ${dataField} ${dataName} ${questionText}`;

  // Log for race/ethnicity detection debugging
  if (searchText.includes('race') || searchText.includes('ethnic') || searchText.includes('hispanic')) {
    console.log('Simplerfy: RACE/ETHNICITY field detected!');
    console.log('  Element:', element.tagName, 'name:', name, 'id:', id);
    console.log('  Question text:', questionText.substring(0, 200));
    console.log('  Full search text:', searchText.substring(0, 300));
  }

  // Score each field type based on keyword matches
  // Give HIGHER weight to matches in element attributes vs surrounding text
  const scores = {};
  for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS)) {
    let attrMatchCount = patterns.filter(p => elementAttrs.includes(p)).length;
    let textMatchCount = patterns.filter(p => questionText.includes(p)).length;
    
    // Element attribute matches are worth 10x more than question text matches
    const totalScore = (attrMatchCount * 10) + textMatchCount;
    
    if (totalScore > 0) {
      scores[fieldType] = totalScore;
    }
  }

  // Apply disambiguation rules to prevent misidentification
  applyDisambiguation(scores, searchText);

  // Find best match
  const sortedMatches = Object.entries(scores).sort(([, a], [, b]) => b - a);
  if (sortedMatches.length === 0) return null;

  const [bestFieldType] = sortedMatches[0];
  const value = getFieldValue(bestFieldType, profile);

  return { type: bestFieldType, value };
}

// Disambiguation rules to prevent misidentification of fields
function applyDisambiguation(scores, text) {
  // fullName: skip if text clearly has first/last/given/family
  if (text.includes('first') || text.includes('last') || text.includes('given') || text.includes('family')) {
    delete scores.fullName;
  }

  // streetAddress: skip if text has address2 markers
  if (text.includes('line_2') || text.includes('line2') || text.includes('address2') ||
      text.includes('apt') || text.includes('suite') || text.includes('unit') || text.includes('apartment')) {
    delete scores.streetAddress;
  }

  // phone: skip if text has extension markers
  if (text.includes('ext') || text.includes('extension')) {
    delete scores.phone;
  }

  // school: skip if text has visa/immigration context
  if (text.includes('visa') || text.includes('immigration') || text.includes('sponsor') ||
      text.includes('nonimmigrant') || text.includes('cpt') || text.includes('opt') ||
      text.includes('work authorization') || text.includes('employment eligibility')) {
    delete scores.school;
  }

  // state: skip if text says "statement", "stated", or "united states"
  if (text.includes('statement') || text.includes('stated') || text.includes('united states')) {
    delete scores.state;
  }

  // country: skip if immediate element context says state/province (not country)
  if ((text.includes('state') || text.includes('province')) &&
      !text.includes('country') && !text.includes('nation')) {
    delete scores.country;
  }

  // relocate vs relocAssist: if text has assistance/package/support, prefer relocAssist
  if (text.includes('assistance') || text.includes('package') || text.includes('support') ||
      text.includes('stipend') || text.includes('allowance') || text.includes('reimbursement')) {
    delete scores.relocate;
  }

  // website/linkedin/github: skip if text says twitter, facebook, instagram, tiktok, or "other"
  if (text.includes('twitter') || text.includes('x.com') || text.includes('x profile') ||
      text.includes('facebook') || text.includes('instagram') || text.includes('tiktok') ||
      text.includes('other website') || text.includes('other url') || text.includes('other link') ||
      text.includes('additional url') || text.includes('additional link') || text.includes('additional website')) {
    delete scores.website;
    delete scores.linkedin;
    delete scores.github;
  }

  // streetAddress: skip if text is clearly about city/state/zip/country
  if ((text.includes('city') || text.includes('town') || text.includes('zip') ||
       text.includes('postal') || text.includes('country')) && !text.includes('street') && !text.includes('address_1')) {
    delete scores.streetAddress;
  }

  // yearsExp: always return null (leave blank)
  delete scores.yearsExp;
}

// Get value for a field type from profile
function getFieldValue(fieldType, profile) {
  const { basics, education, experience, applicationPreferences } = profile;

  const fieldValues = {
    firstName: basics?.firstName,
    lastName: basics?.lastName,
    fullName: `${basics?.firstName || ''} ${basics?.lastName || ''}`.trim(),
    email: basics?.email,
    phone: basics?.phone,
    linkedin: basics?.linkedin,
    github: basics?.github,
    website: basics?.website,
    streetAddress: basics?.streetAddress,
    streetAddress2: basics?.streetAddress2,
    city: basics?.city,
    state: basics?.state,
    zipCode: basics?.zipCode,
    country: basics?.country,
    company: experience?.[0]?.company,
    title: experience?.[0]?.title,
    school: education?.[0]?.institution,
    degree: education?.[0]?.degree,
    major: education?.[0]?.field,
    gpa: education?.[0]?.gpa,
    jobSource: 'LinkedIn',
    authorized: applicationPreferences?.isAuthorizedToWork ? 'Yes' : 'No',
    sponsorship: applicationPreferences?.requiresSponsorship ? 'Yes' : 'No',
    relocate: applicationPreferences?.willingToRelocate ? 'Yes' : 'No',
    over18: (applicationPreferences?.isOver18 ?? true) ? 'Yes' : 'No',
    salary: applicationPreferences?.desiredSalary,
    startDate: applicationPreferences?.availableStartDate,
    gender: applicationPreferences?.gender,
    ethnicity: applicationPreferences?.ethnicity,
    // Default veteran to "not a veteran" if undefined
    veteran: applicationPreferences?.veteranStatus || 'I am not a protected veteran',
    // Default disability to "decline to answer" if undefined
    disability: applicationPreferences?.disabilityStatus || 'I do not wish to answer',
    citizenship: applicationPreferences?.citizenship,
    previouslyEmployed: 'No',
    governmentEmployee: 'No',
    dealerPartnerSupplier: 'No',
    restrictiveCovenant: 'No',
    hybridSchedule: 'Yes',
    businessTravel: 'Yes',
    relocAssist: 'No',
    yearsExp: null  // Leave blank
  };

  return fieldValues[fieldType] || null;
}

// Detect if element needs async handling (custom components, framework-managed, etc.)
function detectNeedsAsync(element) {
  // Native form elements are instant
  if (element.tagName === 'SELECT' && !element.hasAttribute('role')) {
    return false;
  }

  if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') &&
      element.type !== 'checkbox' &&
      element.type !== 'radio' &&
      !element.hasAttribute('role') &&
      !element.hasAttribute('data-testid') &&
      !element.hasAttribute('data-automation-id')) {
    return false;
  }

  // Custom components need async
  const isCustom =
    element.hasAttribute('role') ||
    element.getAttribute('aria-haspopup') ||
    element.hasAttribute('data-automation-id') ||
    element.hasAttribute('data-testid') ||
    element.classList.toString().includes('react') ||
    element.classList.toString().includes('custom');

  return isCustom;
}

// Fill an element with a value
function fillElement(element, detection) {
  if (!detection || !detection.value) {
    if (detection) {
      console.log('Simplerfy: Skipping field due to empty value - type:', detection.type, 'value:', detection.value);
    }
    return false;
  }

  const { type, value } = detection;
  console.log('Simplerfy: fillElement - type:', type, 'value:', value, 'tag:', element.tagName);

  if (element.tagName === 'SELECT') {
    return fillSelect(element, value, type);
  } else if (element.type === 'checkbox') {
    return fillCheckbox(element, value, type);
  } else if (element.type === 'radio') {
    return fillRadio(element, value, type);
  } else if (isCustomDropdown(element)) {
    fillCustomDropdown(element, value, type);
    return true;
  } else {
    triggerInputEvents(element, value);
    return true;
  }
}

// Detect if element is a custom dropdown component (not native <select>)
function isCustomDropdown(element) {
  if (element.tagName === 'SELECT') return false;
  if (element.type === 'checkbox' || element.type === 'radio') return false;

  const role = element.getAttribute('role');
  if (role === 'combobox' || role === 'listbox') return true;
  if (element.getAttribute('aria-haspopup')) return true;
  if (element.getAttribute('aria-expanded') !== null) return true;
  if (element.getAttribute('aria-autocomplete')) return true;

  const dataAutomationId = (element.getAttribute('data-automation-id') || '').toLowerCase();
  if (dataAutomationId.includes('select') || dataAutomationId.includes('dropdown')) return true;

  return false;
}

// Fill a custom dropdown by clicking to open it and selecting an option
function fillCustomDropdown(element, value, fieldType) {
  element.focus();
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  element.click();

  // Wait for dropdown to appear, then find and click the best option
  setTimeout(() => {
    const option = findDropdownOption(element, value, fieldType);
    if (option) {
      option.scrollIntoView({ block: 'nearest' });
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      option.click();
    } else {
      // Fallback: type the value if no clickable option found
      triggerInputEvents(element, value);
    }
  }, 200);
}

// Find the best matching option in an open dropdown
function findDropdownOption(element, value, fieldType) {
  const valueLower = (value || '').toLowerCase().trim();
  let options = [];

  // 1. Check aria-controls/aria-owns for linked listbox
  const controlsId = element.getAttribute('aria-controls') || element.getAttribute('aria-owns');
  if (controlsId) {
    const container = document.getElementById(controlsId);
    if (container) {
      options = Array.from(container.querySelectorAll('[role="option"], li'));
    }
  }

  // 2. Look for any visible listbox/menu in the document
  if (options.length === 0) {
    const containers = document.querySelectorAll('[role="listbox"], [role="menu"]');
    for (const c of containers) {
      if (c.offsetHeight > 0 && c.offsetWidth > 0) {
        options = Array.from(c.querySelectorAll('[role="option"], li'));
        if (options.length > 0) break;
      }
    }
  }

  // 3. Look near the element for dropdown-like containers
  if (options.length === 0) {
    let searchParent = element.parentElement;
    for (let i = 0; i < 8 && searchParent; i++) {
      const optionEls = searchParent.querySelectorAll(
        '[role="option"], li[class*="option"], [class*="menu-item"], [class*="select-option"], [class*="dropdown-item"]'
      );
      if (optionEls.length > 0) {
        options = Array.from(optionEls);
        break;
      }
      searchParent = searchParent.parentElement;
    }
  }

  if (options.length === 0) return null;

  // Filter out hidden options
  options = options.filter(opt => opt.offsetHeight > 0 || opt.offsetWidth > 0);
  if (options.length === 0) return null;

  return matchOption(options, valueLower, fieldType);
}

// Find best matching race/ethnicity option using similarity scoring
// Takes array of lowercase option texts, returns index of best match (-1 if none)
function findBestRaceMatch(texts, valueLower) {
  let userCategory = null;
  let userAliases = [];

  // Determine which ethnicity category the user selected
  for (const [canonical, aliases] of Object.entries(ETHNICITY_ALIASES)) {
    if (valueLower === canonical || aliases.some(a => valueLower.includes(a) || a.includes(valueLower))) {
      userCategory = canonical;
      userAliases = [canonical, ...aliases];
      break;
    }
  }

  console.log('Simplerfy: findBestRaceMatch - user value:', valueLower, 'category:', userCategory);

  if (!userCategory) return -1;

  // Check if user selected Hispanic
  const userIsHispanic = userCategory === 'hispanic or latino';

  let bestIndex = -1;
  let bestScore = 0;

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text || text === 'select' || text === 'choose' || text === '--' || text === 'please select') continue;

    // Skip options that don't match the Hispanic status
    // If user is NOT Hispanic, skip options that are "Hispanic or Latino" without "Not"
    // If user IS Hispanic, skip options that have "(Not Hispanic"
    const optionIsHispanic = (text.includes('hispanic') || text.includes('latino')) && 
                             !text.includes('not hispanic') && 
                             !text.includes('(not ') &&
                             !text.includes('non-hispanic');
    const optionIsNotHispanic = text.includes('not hispanic') || text.includes('(not ') || text.includes('non-hispanic');

    if (!userIsHispanic && optionIsHispanic && !optionIsNotHispanic) {
      // User is NOT Hispanic, skip pure Hispanic option
      console.log('Simplerfy: Skipping Hispanic option for non-Hispanic user:', text);
      continue;
    }
    if (userIsHispanic && optionIsNotHispanic) {
      // User IS Hispanic, skip "Not Hispanic" variants
      console.log('Simplerfy: Skipping Not Hispanic option for Hispanic user:', text);
      continue;
    }

    let score = 0;

    for (const alias of userAliases) {
      // Word boundary for aliases containing 'asian' to prevent matching 'caucasian'
      if (alias.includes('asian')) {
        const wordRegex = new RegExp('\\b' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (wordRegex.test(text)) {
          score += alias.length * 10; // Higher weight for word-boundary matches
        }
      } else {
        if (text.includes(alias)) {
          score += alias.length;
        }
      }
    }

    // Bonus for exact or near-exact matches
    if (text === userCategory || text.startsWith(userCategory)) {
      score += 100;
    }

    console.log('Simplerfy: Option', i, ':', text, '- score:', score);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  console.log('Simplerfy: Best match index:', bestIndex, 'score:', bestScore);
  return bestIndex;
}

// Match an option from a list of DOM elements based on field type and value
function matchOption(options, valueLower, fieldType) {
  // State field - match abbreviation or full name
  if (fieldType === 'state') {
    const stateAbbrev = STATE_REVERSE_MAP[valueLower] || valueLower;
    const stateFull = STATE_MAP[valueLower] || valueLower;
    for (const opt of options) {
      const text = opt.textContent.toLowerCase().trim();
      if (text === stateAbbrev || text === stateFull ||
          text.includes(stateFull) || text.startsWith(stateAbbrev + ' ') ||
          text.startsWith(stateAbbrev + '-')) {
        return opt;
      }
    }
  }

  // Job source - always LinkedIn
  if (fieldType === 'jobSource') {
    for (const opt of options) {
      if (opt.textContent.toLowerCase().includes('linkedin')) return opt;
    }
  }

  // Questions that should always be "No"
  if (['previouslyEmployed', 'governmentEmployee', 'dealerPartnerSupplier', 'restrictiveCovenant', 'relocAssist'].includes(fieldType)) {
    for (const opt of options) {
      const text = opt.textContent.toLowerCase().trim();
      if (text === 'no' || text.startsWith('no ') || text.startsWith('no,')) return opt;
    }
  }

  // Yes/No questions
  if (['authorized', 'sponsorship', 'relocate', 'over18', 'hybridSchedule', 'businessTravel'].includes(fieldType)) {
    const isYes = valueLower === 'yes';
    for (const opt of options) {
      const text = opt.textContent.toLowerCase().trim();
      if (isYes && (text === 'yes' || text.startsWith('yes'))) return opt;
      if (!isYes && (text === 'no' || text.startsWith('no'))) return opt;
    }
  }

  // Veteran status
  if (fieldType === 'veteran') {
    const notVeteranPatterns = ['not a protected veteran', 'not a veteran', 'i am not'];
    const userNotVeteran = notVeteranPatterns.some(p => valueLower.includes(p)) || valueLower === 'no';
    if (userNotVeteran) {
      for (const opt of options) {
        const text = opt.textContent.toLowerCase();
        if (notVeteranPatterns.some(p => text.includes(p))) return opt;
      }
    }
    for (const opt of options) {
      const text = opt.textContent.toLowerCase();
      if (text.includes(valueLower) || valueLower.includes(text.trim())) return opt;
    }
  }

  // Disability
  if (fieldType === 'disability') {
    const noAnswerPatterns = ['do not wish to answer', "don't wish to answer", 'prefer not', 'decline to'];
    const userNoAnswer = noAnswerPatterns.some(p => valueLower.includes(p));
    if (userNoAnswer) {
      for (const opt of options) {
        const text = opt.textContent.toLowerCase();
        if (noAnswerPatterns.some(p => text.includes(p))) return opt;
      }
    }
    const hasDisabilityPatterns = ['yes, i have', 'i have a disability'];
    const noDisabilityPatterns = ['no, i do not', "no, i don't", 'i do not have a disability'];
    if (hasDisabilityPatterns.some(p => valueLower.includes(p))) {
      for (const opt of options) {
        const text = opt.textContent.toLowerCase();
        if (hasDisabilityPatterns.some(p => text.includes(p))) return opt;
      }
    }
    if (noDisabilityPatterns.some(p => valueLower.includes(p)) || valueLower === 'no') {
      for (const opt of options) {
        const text = opt.textContent.toLowerCase();
        if (noDisabilityPatterns.some(p => text.includes(p))) return opt;
      }
    }
  }

  // Gender/Ethnicity — use fuzzy matching with aliases
  if (['gender', 'ethnicity'].includes(fieldType)) {
    if (!valueLower) return null; // No value set — don't guess

    // Check if this is a Hispanic-only question (not a full race dropdown)
    const allTexts = options.map(o => o.textContent.toLowerCase().trim());
    console.log('Simplerfy: Ethnicity/Gender options:', allTexts);
    
    // Get the question/label text to check if this is asking about Hispanic status
    const questionText = getFullQuestionText(options[0]?.closest('form, .field, .question, div') || document.body).toLowerCase();
    const isHispanicQuestionByLabel = questionText.includes('hispanic') || questionText.includes('latino');
    
    const hasHispanicOption = allTexts.some(t => t.includes('hispanic') || t.includes('latino'));
    const hasOtherRaces = allTexts.some(t =>
      (t.includes('asian') && !t.includes('caucasian')) ||
      t.includes('white') ||
      t.includes('caucasian') ||
      t.includes('black') ||
      t.includes('african') ||
      t.includes('native american') ||
      t.includes('american indian') ||
      t.includes('pacific islander') ||
      t.includes('two or more')
    );

    // It's a Hispanic-only question if:
    // 1. The label mentions Hispanic AND options are yes/no style, OR
    // 2. Options have Hispanic but no other race options
    const hasYesNoOptions = allTexts.some(t => t === 'yes' || t === 'no');
    const isHispanicOnlyQuestion = fieldType === 'ethnicity' && (
      (isHispanicQuestionByLabel && hasYesNoOptions) ||
      (hasHispanicOption && !hasOtherRaces)
    );
    
    console.log('Simplerfy: isHispanicOnlyQuestion:', isHispanicOnlyQuestion, 
      'byLabel:', isHispanicQuestionByLabel, 'hasYesNo:', hasYesNoOptions,
      'hasHispanic:', hasHispanicOption, 'hasOtherRaces:', hasOtherRaces);

    if (isHispanicOnlyQuestion) {
      const userIsHispanic = valueLower.includes('hispanic') || valueLower.includes('latino');
      console.log('Simplerfy: Hispanic-only question detected. User is Hispanic:', userIsHispanic, 'User value:', valueLower);
      let matched = null;

      if (userIsHispanic) {
        // User IS Hispanic — find the "Yes" or positive Hispanic option
        for (const opt of options) {
          const text = opt.textContent.toLowerCase().trim();
          if (text === 'yes' || text.startsWith('yes,') || text.startsWith('yes ')) {
            matched = opt;
            console.log('Simplerfy: Selected Yes option for Hispanic user:', text);
            break;
          }
          if ((text.includes('hispanic') || text.includes('latino')) &&
              !text.includes('not ') && !text.includes('non-') && !text.includes('non ') &&
              text !== 'no') {
            matched = opt;
            console.log('Simplerfy: Selected Hispanic option:', text);
            break;
          }
        }
      } else {
        // User is NOT Hispanic — find "No" or "Not Hispanic" option
        for (const opt of options) {
          const text = opt.textContent.toLowerCase().trim();
          if (text === 'no' || text.startsWith('no,') || text.startsWith('no ')) {
            matched = opt;
            console.log('Simplerfy: Selected No option for non-Hispanic user:', text);
            break;
          }
          if (text.includes('not hispanic') || text.includes('not latino') ||
              text.includes('non-hispanic') || text.includes('non hispanic')) {
            matched = opt;
            console.log('Simplerfy: Selected Not Hispanic option:', text);
            break;
          }
        }
        // Try decline option
        if (!matched) {
          for (const opt of options) {
            const text = opt.textContent.toLowerCase().trim();
            if (text.includes('decline') || text.includes('prefer not')) {
              matched = opt;
              console.log('Simplerfy: Selected Decline option:', text);
              break;
            }
          }
        }
      }

      // Schedule async rescans for the race question that may appear after Hispanic answer
      if (matched && _currentProfile) {
        setTimeout(() => rescanForm(_currentProfile), 500);
        setTimeout(() => rescanForm(_currentProfile), 1000);
        setTimeout(() => rescanForm(_currentProfile), 2000);
      }
      return matched;
    }

    // For full race/ethnicity dropdowns - use similarity matching
    if (fieldType === 'ethnicity') {
      console.log('Simplerfy: Full race dropdown, using findBestRaceMatch for value:', valueLower);
      const optionTexts = options.map(o => o.textContent.toLowerCase().trim());
      const bestIdx = findBestRaceMatch(optionTexts, valueLower);
      if (bestIdx >= 0) return options[bestIdx];
      return null;
    }

    // Gender - partial word match
    if (fieldType === 'gender') {
      for (const opt of options) {
        const text = opt.textContent.toLowerCase().trim();
        if (text.includes(valueLower) || valueLower.includes(text)) return opt;
      }
    }

    return null;
  }

  // General matching with scoring
  let bestMatch = null;
  let bestScore = 0;

  for (const opt of options) {
    const text = opt.textContent.toLowerCase().trim();
    if (!text || text === 'select' || text === 'choose' || text === '--' || text === 'select...' || text === 'please select') continue;

    if (text === valueLower) return opt;

    if (text.includes(valueLower) && valueLower.length > 1) {
      const score = valueLower.length / text.length;
      if (score > bestScore) { bestScore = score; bestMatch = opt; }
    }

    if (valueLower.includes(text) && text.length > 1) {
      const score = (text.length / valueLower.length) * 0.8;
      if (score > bestScore) { bestScore = score; bestMatch = opt; }
    }
  }

  return bestMatch;
}

// Fill select element
function fillSelect(select, value, fieldType) {
  const valueLower = (value || '').toLowerCase().trim();
  console.log('Simplerfy: fillSelect called - fieldType:', fieldType, 'value:', valueLower, 'select name:', select.name);

  // State field special handling
  if (fieldType === 'state' && valueLower) {
    const stateAbbrev = STATE_REVERSE_MAP[valueLower] || valueLower;
    const stateFull = STATE_MAP[valueLower] || valueLower;

    for (const option of select.options) {
      const optText = (option.text || '').toLowerCase().trim();
      const optValue = (option.value || '').toLowerCase().trim();

      if (optValue === stateAbbrev || optText === stateAbbrev ||
          optValue === stateFull || optText === stateFull ||
          optText.includes(stateFull) || optValue.includes(stateFull) ||
          optText.startsWith(stateAbbrev + ' ') || optText.startsWith(stateAbbrev + '-')) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
  }

  // Job source always selects LinkedIn
  if (fieldType === 'jobSource') {
    for (const option of select.options) {
      const optText = (option.text || '').toLowerCase();
      const optValue = (option.value || '').toLowerCase();
      if (optText.includes('linkedin') || optValue.includes('linkedin')) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
  }

  // Questions that should always be "No"
  if (['previouslyEmployed', 'governmentEmployee', 'dealerPartnerSupplier', 'restrictiveCovenant'].includes(fieldType)) {
    for (const option of select.options) {
      const optText = option.text.toLowerCase();
      const optValue = option.value.toLowerCase();
      if (optText.includes('no') || optValue === 'no' || optValue === 'false' || optValue === '0') {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
  }

  // Yes/No questions
  if (['authorized', 'sponsorship', 'relocate', 'over18', 'hybridSchedule', 'businessTravel'].includes(fieldType)) {
    const isYes = valueLower === 'yes';
    for (const option of select.options) {
      const optText = option.text.toLowerCase();
      const optValue = option.value.toLowerCase();

      if (isYes && (optText.includes('yes') || optValue === 'yes' || optValue === 'true' || optValue === '1')) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
      if (!isYes && (optText.includes('no') || optValue === 'no' || optValue === 'false' || optValue === '0')) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
  }

  // Relocation assistance special handling
  if (fieldType === 'relocAssist') {
    // Answer "No" (doesn't need assistance)
    for (const option of select.options) {
      const optText = option.text.toLowerCase();
      const optValue = option.value.toLowerCase();
      if (optText.includes('no') || optValue === 'no' || optValue === 'false') {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
  }

  // Veteran status special handling
  if (fieldType === 'veteran') {
    console.log('Simplerfy: Veteran field detected, user value:', valueLower);
    const notVeteranPatterns = ['not a protected veteran', 'not a veteran', 'i am not', 'no'];
    const userNotVeteran = notVeteranPatterns.some(p => valueLower.includes(p)) || valueLower === 'no';
    console.log('Simplerfy: User is NOT a veteran:', userNotVeteran);
    
    const optionTexts = Array.from(select.options).map(o => o.text.toLowerCase().trim());
    console.log('Simplerfy: Veteran options:', optionTexts);

    if (userNotVeteran) {
      for (const option of select.options) {
        const optText = option.text.toLowerCase();
        if (notVeteranPatterns.some(p => optText.includes(p))) {
          select.value = option.value;
          triggerInputEvents(select);
          console.log('Simplerfy: Selected veteran option:', optText);
          return true;
        }
      }
    }
    
    // If user IS a veteran or pattern didn't match, try to find matching option
    for (const option of select.options) {
      const optText = option.text.toLowerCase();
      if (optText.includes(valueLower) || valueLower.includes(optText.trim())) {
        select.value = option.value;
        triggerInputEvents(select);
        console.log('Simplerfy: Selected veteran option by match:', optText);
        return true;
      }
    }
  }

  // Disability special handling - match "do not wish to answer" patterns
  if (fieldType === 'disability') {
    const noAnswerPatterns = ['do not wish to answer', "don't wish to answer", 'prefer not', 'decline to'];
    const userNoAnswer = noAnswerPatterns.some(p => valueLower.includes(p));

    if (userNoAnswer) {
      for (const option of select.options) {
        const optText = option.text.toLowerCase();
        if (noAnswerPatterns.some(p => optText.includes(p))) {
          select.value = option.value;
          triggerInputEvents(select);
          return true;
        }
      }
    }
  }

  // Ethnicity/race specific handling with proper Hispanic question detection
  if (fieldType === 'ethnicity') {
    console.log('Simplerfy: fillSelectElement - ethnicity field, value:', valueLower);
    
    // Try "prefer not" / "decline" first if user selected that or has no value
    if (!valueLower || valueLower === 'prefer not to say' || valueLower === 'decline') {
      for (const option of select.options) {
        const optText = option.text.toLowerCase();
        if (optText.includes('prefer not') || optText.includes('decline') || optText.includes('do not wish')) {
          select.value = option.value;
          triggerInputEvents(select);
          return true;
        }
      }
      return false;
    }

    // Check if this is a Hispanic-only question
    const optionTexts = Array.from(select.options).map(o => o.text.toLowerCase().trim());
    console.log('Simplerfy: Select options:', optionTexts);
    
    const hasHispanicOption = optionTexts.some(t => t.includes('hispanic') || t.includes('latino'));
    const hasOtherRaces = optionTexts.some(t =>
      (t.includes('asian') && !t.includes('caucasian')) ||
      t.includes('white') ||
      t.includes('caucasian') ||
      t.includes('black') ||
      t.includes('african') ||
      t.includes('native american') ||
      t.includes('american indian') ||
      t.includes('pacific islander') ||
      t.includes('two or more')
    );

    const isHispanicOnlyQuestion = hasHispanicOption && !hasOtherRaces;
    console.log('Simplerfy: isHispanicOnlyQuestion:', isHispanicOnlyQuestion);

    if (isHispanicOnlyQuestion) {
      const userIsHispanic = valueLower.includes('hispanic') || valueLower.includes('latino');
      console.log('Simplerfy: Hispanic-only select. User is Hispanic:', userIsHispanic);
      let filled = false;

      if (userIsHispanic) {
        for (const option of select.options) {
          const optText = option.text.toLowerCase().trim();
          if ((optText.includes('hispanic') || optText.includes('latino')) &&
              !optText.includes('not ') && !optText.includes('non-') && !optText.includes('non ') &&
              optText !== 'no') {
            select.value = option.value;
            triggerInputEvents(select);
            console.log('Simplerfy: Selected Hispanic option:', optText);
            filled = true;
            break;
          }
        }
        // Try "yes" option
        if (!filled) {
          for (const option of select.options) {
            const optText = option.text.toLowerCase().trim();
            if (optText === 'yes' || optText.startsWith('yes,') || optText.startsWith('yes ')) {
              select.value = option.value;
              triggerInputEvents(select);
              console.log('Simplerfy: Selected Yes option:', optText);
              filled = true;
              break;
            }
          }
        }
      } else {
        // User is NOT Hispanic
        for (const option of select.options) {
          const optText = option.text.toLowerCase().trim();
          if (optText.includes('not hispanic') || optText.includes('not latino') ||
              optText.includes('non-hispanic') || optText.includes('non hispanic')) {
            select.value = option.value;
            triggerInputEvents(select);
            console.log('Simplerfy: Selected Not Hispanic option:', optText);
            filled = true;
            break;
          }
        }
        // Try simple "no" option
        if (!filled) {
          for (const option of select.options) {
            const optText = option.text.toLowerCase().trim();
            if (optText === 'no' || optText.startsWith('no,') || optText.startsWith('no ')) {
              select.value = option.value;
              triggerInputEvents(select);
              console.log('Simplerfy: Selected No option:', optText);
              filled = true;
              break;
            }
          }
        }
        // Try decline
        if (!filled) {
          for (const option of select.options) {
            const optText = option.text.toLowerCase().trim();
            if (optText.includes('decline') || optText.includes('prefer not') || optText.includes('do not wish')) {
              select.value = option.value;
              triggerInputEvents(select);
              console.log('Simplerfy: Selected Decline option:', optText);
              filled = true;
              break;
            }
          }
        }
      }

      // Schedule async rescans for the race question that may appear after Hispanic answer
      if (filled && _currentProfile) {
        setTimeout(() => rescanForm(_currentProfile), 500);
        setTimeout(() => rescanForm(_currentProfile), 1000);
        setTimeout(() => rescanForm(_currentProfile), 2000);
      }
      return filled;
    }

    // Full race dropdown - use similarity matching
    console.log('Simplerfy: Full race select dropdown, using findBestRaceMatch for value:', valueLower);
    const selectOptionTexts = Array.from(select.options).map(o => (o.text || '').toLowerCase().trim());
    console.log('Simplerfy: Select option texts:', selectOptionTexts);
    const bestIdx = findBestRaceMatch(selectOptionTexts, valueLower);
    console.log('Simplerfy: Best match index:', bestIdx, 'option:', bestIdx >= 0 ? selectOptionTexts[bestIdx] : 'none');
    if (bestIdx >= 0) {
      select.value = select.options[bestIdx].value;
      triggerInputEvents(select);
      console.log('Simplerfy: Selected race option:', select.options[bestIdx].text);
      return true;
    }

    return false;
  }

  // Gender specific handling
  if (fieldType === 'gender') {
    if (!valueLower || valueLower === 'prefer not to say' || valueLower === 'decline') {
      for (const option of select.options) {
        const optText = option.text.toLowerCase();
        if (optText.includes('prefer not') || optText.includes('decline') || optText.includes('do not wish')) {
          select.value = option.value;
          triggerInputEvents(select);
          return true;
        }
      }
    }
    for (const option of select.options) {
      const optText = option.text.toLowerCase().trim();
      if (!optText || optText === 'select' || optText === 'choose' || optText === '--') continue;
      if (optText.includes(valueLower) || valueLower.includes(optText)) {
        select.value = option.value;
        triggerInputEvents(select);
        return true;
      }
    }
    return false;
  }

  // General matching - require minimum 3 chars for reverse containment to prevent short codes matching
  for (const option of select.options) {
    const optText = option.text.toLowerCase().trim();
    const optValue = option.value.toLowerCase().trim();

    // Skip empty/placeholder options
    if (!optValue || optText === 'select' || optText === 'choose' || optText === '--') continue;

    // Exact match
    if (optText === valueLower || optValue === valueLower) {
      select.value = option.value;
      triggerInputEvents(select);
      return true;
    }

    // Option text/value contains user value (reliable direction)
    if (valueLower.length >= 2 && (optText.includes(valueLower) || optValue.includes(valueLower))) {
      select.value = option.value;
      triggerInputEvents(select);
      return true;
    }

    // User value contains option text (only if option text is long enough to be meaningful)
    if (optText.length >= 4 && valueLower.includes(optText)) {
      select.value = option.value;
      triggerInputEvents(select);
      return true;
    }
  }

  return false;
}

// Fill checkbox element
function fillCheckbox(checkbox, value, fieldType) {
  // Questions that should always be unchecked
  if (['previouslyEmployed', 'governmentEmployee', 'dealerPartnerSupplier', 'restrictiveCovenant'].includes(fieldType)) {
    checkbox.checked = false;
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

  // Job source always selects LinkedIn
  if (fieldType === 'jobSource') {
    if (radioValue.includes('linkedin') || labelText.includes('linkedin')) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
    return false;
  }

  // Questions that should always be "No"
  if (['previouslyEmployed', 'governmentEmployee', 'dealerPartnerSupplier', 'restrictiveCovenant'].includes(fieldType)) {
    if (radioValue === 'no' || radioValue === 'false' || radioValue === '0' ||
        (labelText.includes('no') && !labelText.includes('yes'))) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
    return false;
  }

  // Yes/No questions
  if (['authorized', 'sponsorship', 'relocate', 'over18', 'hybridSchedule', 'businessTravel'].includes(fieldType)) {
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

  // Relocation assistance
  if (fieldType === 'relocAssist') {
    if (radioValue === 'no' || radioValue === 'false' || (labelText.includes('no') && !labelText.includes('yes'))) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
    return false;
  }

  // Veteran status special handling
  if (fieldType === 'veteran') {
    const notVeteranPatterns = ['not a protected veteran', 'not a veteran', 'i am not', 'no'];
    const combinedText = (radioValue + ' ' + labelText).toLowerCase();
    const isNotVeteranOption = notVeteranPatterns.some(p => combinedText.includes(p));
    const userNotVeteran = notVeteranPatterns.some(p => valueLower.includes(p)) || valueLower === 'no';

    if (userNotVeteran && isNotVeteranOption) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
  }

  // General matching for EEO fields - match on label text, not short value codes
  if (['gender', 'ethnicity', 'disability'].includes(fieldType)) {
    // Prefer not to say / decline
    if (!valueLower || valueLower === 'prefer not to say' || valueLower === 'decline') {
      if (labelText.includes('prefer not') || labelText.includes('decline') || labelText.includes('do not wish')) {
        radio.checked = true;
        triggerInputEvents(radio);
        return true;
      }
      return false;
    }
    // Handle separate Hispanic/Latino radio question
    if (fieldType === 'ethnicity' && (labelText.includes('hispanic') || labelText.includes('latino'))) {
      const userIsHispanic = valueLower.includes('hispanic') || valueLower.includes('latino');
      const isHispanicOption = (labelText.includes('hispanic') || labelText.includes('latino')) &&
        !labelText.includes('not ') && !labelText.includes('non-') && !labelText.includes('non ');
      if (userIsHispanic && isHispanicOption) {
        radio.checked = true;
        triggerInputEvents(radio);
        // Schedule async rescans for race question that may appear after Hispanic answer
        if (_currentProfile) {
          setTimeout(() => rescanForm(_currentProfile), 500);
          setTimeout(() => rescanForm(_currentProfile), 1000);
          setTimeout(() => rescanForm(_currentProfile), 2000);
        }
        return true;
      }
      if (!userIsHispanic && (labelText.includes('not hispanic') || labelText.includes('not latino') ||
          labelText.includes('non-hispanic') || labelText.includes('non hispanic'))) {
        radio.checked = true;
        triggerInputEvents(radio);
        // Schedule async rescans for race question that may appear after Hispanic answer
        if (_currentProfile) {
          setTimeout(() => rescanForm(_currentProfile), 500);
          setTimeout(() => rescanForm(_currentProfile), 1000);
          setTimeout(() => rescanForm(_currentProfile), 2000);
        }
        return true;
      }
      return false;
    }
    // Match race using similarity scoring (ethnicity only)
    if (fieldType === 'ethnicity') {
      const bestIdx = findBestRaceMatch([labelText], valueLower);
      if (bestIdx >= 0) {
        radio.checked = true;
        triggerInputEvents(radio);
        return true;
      }
      return false;
    }
    // Gender - match against label text
    const eeoWordRegex = new RegExp('\\b' + valueLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    if (eeoWordRegex.test(labelText) || (radioValue.length >= 4 && eeoWordRegex.test(radioValue))) {
      radio.checked = true;
      triggerInputEvents(radio);
      return true;
    }
    return false;
  }

  // General matching - require minimum lengths for reverse containment
  if (radioValue === valueLower || labelText.includes(valueLower)) {
    radio.checked = true;
    triggerInputEvents(radio);
    return true;
  }
  if (radioValue.length >= 4 && valueLower.includes(radioValue)) {
    radio.checked = true;
    triggerInputEvents(radio);
    return true;
  }

  return false;
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

  const parent = element.closest('div, fieldset, section, li');
  if (parent) {
    const parentLabelEl = parent.querySelector('label, legend, h3, h4, .label, span');
    if (parentLabelEl) {
      labelText += ' ' + parentLabelEl.textContent.toLowerCase();
    }
  }
  return labelText;
}

// Trigger input events to notify frameworks of changes
// Accepts optional value param - when provided, uses native setter to set the value
// (bypasses React's synthetic setter to prevent values disappearing on click)
function triggerInputEvents(element, value) {
  element.focus();

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;

  const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    'value'
  )?.set;

  // Step 1: Set value using native setter (bypasses React's controlled component setter)
  const newValue = value !== undefined ? value : element.value;

  if (element.tagName === 'INPUT' && nativeInputValueSetter && element.type !== 'checkbox' && element.type !== 'radio') {
    nativeInputValueSetter.call(element, newValue);
  } else if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(element, newValue);
  } else if (element.tagName === 'SELECT' && nativeSelectValueSetter) {
    nativeSelectValueSetter.call(element, newValue);
  }

  // Step 2: Reset React's value tracker so it detects the change
  const tracker = element._valueTracker;
  if (tracker) {
    tracker.setValue('');
  }

  // Step 3: Dispatch events to notify frameworks
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

// Handle resume upload
function handleResumeUpload(profile, selectedResumeId) {
  const resumeFiles = profile.resumeFiles || [];
  const selectedResume = resumeFiles.find(r => r.id === selectedResumeId) || resumeFiles[0];

  if (!selectedResume) return false;

  let uploaded = false;

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

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

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

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    try {
      fileInput.files = dataTransfer.files;
    } catch {
      console.log('Direct assignment failed, trying alternative method');
    }

    if (fileInput.files.length === 0) {
      throw new Error('Failed to set files on input');
    }

    fileInput.focus();

    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    Object.defineProperty(changeEvent, 'target', { writable: false, value: fileInput });
    fileInput.dispatchEvent(changeEvent);

    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    fileInput.dispatchEvent(inputEvent);

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'files'
    );
    if (nativeInputValueSetter && nativeInputValueSetter.set) {
      nativeInputValueSetter.set.call(fileInput, dataTransfer.files);
    }

    fileInput.dispatchEvent(new CustomEvent('filechange', {
      bubbles: true,
      detail: { files: dataTransfer.files }
    }));

    const reactHandler = fileInput._valueTracker;
    if (reactHandler) {
      reactHandler.setValue('');
    }
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    const form = fileInput.closest('form');
    if (form) {
      form.dispatchEvent(new Event('change', { bubbles: true }));
    }

    fileInput.dispatchEvent(new Event('blur', { bubbles: true }));

    setTimeout(() => {
      if (fileInput.files.length === 0) {
        console.log('Simplerfy: File was cleared by site, showing manual upload notice');
        showManualUploadNotice(fileInput, resume);
      }
    }, 100);

    showUploadSuccess(fileInput, resume.fileName);

    console.log('Simplerfy: Uploaded resume:', resume.fileName, 'Files set:', fileInput.files.length);
    return true;
  } catch (error) {
    console.error('Simplerfy: Failed to upload file:', error);
    showManualUploadNotice(fileInput, resume);
    return false;
  }
}

// Show success indicator near file input
function showUploadSuccess(input, fileName) {
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
        <strong>Upload file manually</strong>
        <p style="margin: 4px 0; font-size: 12px;">Simplerfy couldn't auto-upload. Your resume has been downloaded - drag it to the upload field above.</p>
      </div>
    </div>
  `;

  input.parentNode.insertBefore(notice, input.nextSibling);
}

// Download resume file
function downloadResume(resume) {
  try {
    const byteCharacters = atob(resume.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: resume.fileType || 'application/pdf' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = resume.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Simplerfy: Failed to download resume:', error);
  }
}
