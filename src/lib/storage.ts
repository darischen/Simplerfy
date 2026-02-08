export interface ResumeFile {
  id: string;
  name: string;
  fileName: string;
  fileData: string; // base64 encoded PDF
  fileType: string;
  createdAt: string;
}

export interface ApplicationPreferences {
  jobSource: string; // "LinkedIn", "Indeed", etc.
  isOver18: boolean;
  isAuthorizedToWork: boolean;
  requiresSponsorship: boolean;
  willingToRelocate: boolean;
  citizenship: string;
  desiredSalary: string;
  availableStartDate: string;
  gender: string;
  veteranStatus: string;
  disabilityStatus: string;
  ethnicity: string;
}

export interface UserProfile {
  id: string;
  basics: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    // Address fields for accurate autofill
    streetAddress: string;
    streetAddress2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  education: {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }[];
  experience: {
    id: string;
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }[];
  projects: {
    id: string;
    name: string;
    description: string;
    bullets: string[];
    technologies: string[];
    link?: string;
    startDate?: string;
    endDate?: string;
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
  resumes: {
    id: string;
    name: string;
    latex: string;
    createdAt: string;
    updatedAt: string;
  }[];
  resumeFiles: ResumeFile[];
  applicationPreferences: ApplicationPreferences;
}

export interface JobApplication {
  id: string;
  company: string;
  title: string;
  url?: string;
  status: 'saved' | 'applied' | 'screening' | 'interviewing' | 'offer' | 'rejected';
  appliedAt: string;
  updatedAt: string;
  resumeId?: string;
  resumeName?: string;
  notes?: string;
  jobDescription?: string;
}

const PROFILE_KEY = 'simplerfy_profile';
const APPLICATIONS_KEY = 'simplerfy_applications';

// Profile functions
export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function createEmptyProfile(): UserProfile {
  return {
    id: crypto.randomUUID(),
    basics: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      streetAddress: '',
      streetAddress2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    education: [],
    experience: [],
    projects: [],
    skills: [],
    resumes: [],
    resumeFiles: [],
    applicationPreferences: {
      jobSource: 'LinkedIn',
      isOver18: true,
      isAuthorizedToWork: true,
      requiresSponsorship: false,
      willingToRelocate: false,
      citizenship: '',
      desiredSalary: '',
      availableStartDate: '',
      gender: '',
      veteranStatus: 'I am not a protected veteran',
      disabilityStatus: 'I do not wish to answer',
      ethnicity: '',
    },
  };
}

// Resume file functions
export function addResumeFile(
  name: string,
  fileName: string,
  fileData: string,
  fileType: string
): string {
  const profile = getProfile() || createEmptyProfile();
  const id = crypto.randomUUID();

  profile.resumeFiles = profile.resumeFiles || [];
  profile.resumeFiles.push({
    id,
    name,
    fileName,
    fileData,
    fileType,
    createdAt: new Date().toISOString(),
  });

  saveProfile(profile);
  return id;
}

export function deleteResumeFile(id: string): void {
  const profile = getProfile();
  if (!profile) return;

  profile.resumeFiles = (profile.resumeFiles || []).filter((r) => r.id !== id);
  saveProfile(profile);
}

export function getResumeFiles(): ResumeFile[] {
  const profile = getProfile();
  return profile?.resumeFiles || [];
}

// Application functions
export function getApplications(): JobApplication[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(APPLICATIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveApplication(application: JobApplication): void {
  const applications = getApplications();
  const index = applications.findIndex((a) => a.id === application.id);
  if (index >= 0) {
    applications[index] = application;
  } else {
    applications.unshift(application);
  }
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
}

export function deleteApplication(id: string): void {
  const applications = getApplications().filter((a) => a.id !== id);
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
}

// Resume functions
export function saveResume(name: string, latex: string): string {
  const profile = getProfile() || createEmptyProfile();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  profile.resumes.push({
    id,
    name,
    latex,
    createdAt: now,
    updatedAt: now,
  });

  saveProfile(profile);
  return id;
}

export function getResumes(): UserProfile['resumes'] {
  const profile = getProfile();
  return profile?.resumes || [];
}

export function updateResume(id: string, name: string, latex: string): void {
  const profile = getProfile();
  if (!profile) return;

  const index = profile.resumes.findIndex((r) => r.id === id);
  if (index >= 0) {
    profile.resumes[index] = {
      ...profile.resumes[index],
      name,
      latex,
      updatedAt: new Date().toISOString(),
    };
    saveProfile(profile);
  }
}

export function deleteResume(id: string): void {
  const profile = getProfile();
  if (!profile) return;

  profile.resumes = profile.resumes.filter((r) => r.id !== id);
  saveProfile(profile);
}
