'use client';

import { useState, useRef } from 'react';
import {
  UserProfile,
  ResumeFile,
  getProfile,
  saveProfile,
  createEmptyProfile,
} from '@/lib/storage';

interface ParsedResume {
  basics: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string; // Resume parser returns combined location, we'll parse it
    linkedin?: string;
    github?: string;
    website?: string;
  };
  education: {
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }[];
  experience: {
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }[];
  projects: {
    name: string;
    description: string;
    bullets: string[];
    technologies: string[];
    link?: string;
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
}

function getInitialProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return createEmptyProfile();
  }
  const profile = getProfile() || createEmptyProfile();
  // Ensure resumeFiles exists for older profiles
  if (!profile.resumeFiles) {
    profile.resumeFiles = [];
  }
  // Ensure applicationPreferences exists for older profiles
  if (!profile.applicationPreferences) {
    profile.applicationPreferences = {
      jobSource: 'LinkedIn',
      isOver18: true,
      isAuthorizedToWork: true,
      requiresSponsorship: false,
      willingToRelocate: true,
      citizenship: '',
      desiredSalary: '',
      availableStartDate: '',
      gender: 'Male',
      veteranStatus: 'I am not a protected veteran',
      disabilityStatus: 'No, I do no have a disability',
      ethnicity: '',
    };
  }
  // Migrate old location field to new address fields
  const oldProfile = profile as UserProfile & { basics: { location?: string } };
  if (oldProfile.basics.location && !profile.basics.city) {
    // Try to parse "City, State" format
    const parts = oldProfile.basics.location.split(',').map((s) => s.trim());
    if (parts.length >= 2) {
      profile.basics.city = parts[0];
      profile.basics.state = parts[1];
    } else if (parts.length === 1) {
      profile.basics.city = parts[0];
    }
    delete oldProfile.basics.location;
  }
  // Ensure new address fields exist
  if (!profile.basics.streetAddress) profile.basics.streetAddress = '';
  if (!profile.basics.city) profile.basics.city = '';
  if (!profile.basics.state) profile.basics.state = '';
  if (!profile.basics.zipCode) profile.basics.zipCode = '';
  if (!profile.basics.country) profile.basics.country = '';
  return profile;
}

// Helper functions for duplicate detection
function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function isEducationDuplicate(
  existing: UserProfile['education'][0],
  newEdu: ParsedResume['education'][0]
): boolean {
  return (
    normalizeString(existing.institution) === normalizeString(newEdu.institution) &&
    normalizeString(existing.degree) === normalizeString(newEdu.degree) &&
    normalizeString(existing.field) === normalizeString(newEdu.field)
  );
}

function isExperienceDuplicate(
  existing: UserProfile['experience'][0],
  newExp: ParsedResume['experience'][0]
): boolean {
  return (
    normalizeString(existing.company) === normalizeString(newExp.company) &&
    normalizeString(existing.title) === normalizeString(newExp.title) &&
    normalizeString(existing.startDate) === normalizeString(newExp.startDate)
  );
}

function isProjectDuplicate(
  existing: UserProfile['projects'][0],
  newProj: ParsedResume['projects'][0]
): boolean {
  return normalizeString(existing.name) === normalizeString(newProj.name);
}

function isSkillCategoryDuplicate(
  existing: UserProfile['skills'][0],
  newSkill: ParsedResume['skills'][0]
): boolean {
  return normalizeString(existing.category) === normalizeString(newSkill.category);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(getInitialProfile);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [mergeResult, setMergeResult] = useState<{
    added: { education: number; experience: number; projects: number; skills: number };
    skipped: { education: number; experience: number; projects: number; skills: number };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (profile) {
      saveProfile(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // Resume upload and parsing
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setUploading(true);
    setMergeResult(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 data from data URL
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Add resume file to profile
      const resumeName = file.name.replace('.pdf', '');
      const newResumeFile: ResumeFile = {
        id: crypto.randomUUID(),
        name: resumeName,
        fileName: file.name,
        fileData,
        fileType: file.type,
        createdAt: new Date().toISOString(),
      };

      // Update profile with new resume file
      const updatedProfile = {
        ...profile,
        resumeFiles: [...(profile.resumeFiles || []), newResumeFile],
      };

      // Now parse the resume
      setParsing(true);
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse resume');
      }

      const { parsed }: { parsed: ParsedResume } = await response.json();

      // Merge parsed data with existing profile, detecting duplicates
      const result = mergeResumeData(updatedProfile, parsed);

      setProfile(result.profile);
      setMergeResult(result.stats);

      // Auto-save
      saveProfile(result.profile);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload and parse resume. Please try again.');
    } finally {
      setUploading(false);
      setParsing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const mergeResumeData = (
    currentProfile: UserProfile,
    parsed: ParsedResume
  ): {
    profile: UserProfile;
    stats: {
      added: { education: number; experience: number; projects: number; skills: number };
      skipped: { education: number; experience: number; projects: number; skills: number };
    };
  } => {
    const stats = {
      added: { education: 0, experience: 0, projects: 0, skills: 0 },
      skipped: { education: 0, experience: 0, projects: 0, skills: 0 },
    };

    // Update basics only if empty
    const newBasics = { ...currentProfile.basics };
    if (!newBasics.firstName && parsed.basics.firstName) {
      newBasics.firstName = parsed.basics.firstName;
    }
    if (!newBasics.lastName && parsed.basics.lastName) {
      newBasics.lastName = parsed.basics.lastName;
    }
    if (!newBasics.email && parsed.basics.email) {
      newBasics.email = parsed.basics.email;
    }
    if (!newBasics.phone && parsed.basics.phone) {
      newBasics.phone = parsed.basics.phone;
    }
    // Parse location from resume into address fields if city is empty
    if (!newBasics.city && parsed.basics.location) {
      const parts = parsed.basics.location.split(',').map((s) => s.trim());
      if (parts.length >= 2) {
        newBasics.city = parts[0];
        newBasics.state = parts[1];
      } else if (parts.length === 1) {
        newBasics.city = parts[0];
      }
    }
    if (!newBasics.linkedin && parsed.basics.linkedin) {
      newBasics.linkedin = parsed.basics.linkedin;
    }
    if (!newBasics.github && parsed.basics.github) {
      newBasics.github = parsed.basics.github;
    }
    if (!newBasics.website && parsed.basics.website) {
      newBasics.website = parsed.basics.website;
    }

    // Merge education
    const newEducation = [...currentProfile.education];
    for (const edu of parsed.education) {
      const isDuplicate = currentProfile.education.some((existing) =>
        isEducationDuplicate(existing, edu)
      );
      if (isDuplicate) {
        stats.skipped.education++;
      } else {
        newEducation.push({
          id: crypto.randomUUID(),
          ...edu,
        });
        stats.added.education++;
      }
    }

    // Merge experience
    const newExperience = [...currentProfile.experience];
    for (const exp of parsed.experience) {
      const isDuplicate = currentProfile.experience.some((existing) =>
        isExperienceDuplicate(existing, exp)
      );
      if (isDuplicate) {
        stats.skipped.experience++;
      } else {
        newExperience.push({
          id: crypto.randomUUID(),
          ...exp,
        });
        stats.added.experience++;
      }
    }

    // Merge projects
    const newProjects = [...currentProfile.projects];
    for (const proj of parsed.projects) {
      const isDuplicate = currentProfile.projects.some((existing) =>
        isProjectDuplicate(existing, proj)
      );
      if (isDuplicate) {
        stats.skipped.projects++;
      } else {
        newProjects.push({
          id: crypto.randomUUID(),
          ...proj,
        });
        stats.added.projects++;
      }
    }

    // Merge skills (merge items within same category)
    const newSkills = [...currentProfile.skills];
    for (const skill of parsed.skills) {
      const existingIndex = newSkills.findIndex((existing) =>
        isSkillCategoryDuplicate(existing, skill)
      );
      if (existingIndex >= 0) {
        // Merge items, avoiding duplicates
        const existingItems = new Set(
          newSkills[existingIndex].items.map((i) => normalizeString(i))
        );
        const newItems = skill.items.filter(
          (item) => !existingItems.has(normalizeString(item))
        );
        if (newItems.length > 0) {
          newSkills[existingIndex] = {
            ...newSkills[existingIndex],
            items: [...newSkills[existingIndex].items, ...newItems],
          };
          stats.added.skills += newItems.length;
        }
        stats.skipped.skills++;
      } else {
        newSkills.push({
          category: skill.category,
          items: skill.items,
        });
        stats.added.skills++;
      }
    }

    return {
      profile: {
        ...currentProfile,
        basics: newBasics,
        education: newEducation,
        experience: newExperience,
        projects: newProjects,
        skills: newSkills,
      },
      stats,
    };
  };

  const deleteResumeFile = (id: string) => {
    setProfile({
      ...profile,
      resumeFiles: (profile.resumeFiles || []).filter((r) => r.id !== id),
    });
  };

  const downloadResume = (resume: ResumeFile) => {
    const link = document.createElement('a');
    link.href = `data:${resume.fileType};base64,${resume.fileData}`;
    link.download = resume.fileName;
    link.click();
  };

  const updateBasics = (field: keyof UserProfile['basics'], value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      basics: { ...profile.basics, [field]: value },
    });
  };

  // Education handlers
  const addEducation = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      education: [
        ...profile.education,
        {
          id: crypto.randomUUID(),
          institution: '',
          degree: '',
          field: '',
          startDate: '',
          endDate: '',
          gpa: '',
        },
      ],
    });
  };

  const updateEducation = (
    id: string,
    field: keyof UserProfile['education'][0],
    value: string
  ) => {
    if (!profile) return;
    setProfile({
      ...profile,
      education: profile.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    });
  };

  const removeEducation = (id: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      education: profile.education.filter((edu) => edu.id !== id),
    });
  };

  // Experience handlers
  const addExperience = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      experience: [
        ...profile.experience,
        {
          id: crypto.randomUUID(),
          company: '',
          title: '',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          bullets: [''],
        },
      ],
    });
  };

  const updateExperience = (
    id: string,
    field: keyof UserProfile['experience'][0],
    value: string | boolean | string[]
  ) => {
    if (!profile) return;
    setProfile({
      ...profile,
      experience: profile.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    });
  };

  const removeExperience = (id: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      experience: profile.experience.filter((exp) => exp.id !== id),
    });
  };

  const addBullet = (expId: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      experience: profile.experience.map((exp) =>
        exp.id === expId ? { ...exp, bullets: [...exp.bullets, ''] } : exp
      ),
    });
  };

  const updateBullet = (expId: string, index: number, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      experience: profile.experience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.map((b, i) => (i === index ? value : b)),
            }
          : exp
      ),
    });
  };

  const removeBullet = (expId: string, index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      experience: profile.experience.map((exp) =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.filter((_, i) => i !== index) }
          : exp
      ),
    });
  };

  // Project handlers
  const addProject = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: [
        ...profile.projects,
        {
          id: crypto.randomUUID(),
          name: '',
          description: '',
          bullets: [''],
          technologies: [],
          link: '',
        },
      ],
    });
  };

  const updateProject = (
    id: string,
    field: keyof UserProfile['projects'][0],
    value: string | string[]
  ) => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: profile.projects.map((proj) =>
        proj.id === id ? { ...proj, [field]: value } : proj
      ),
    });
  };

  const removeProject = (id: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: profile.projects.filter((proj) => proj.id !== id),
    });
  };

  const addProjectBullet = (projId: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: profile.projects.map((proj) =>
        proj.id === projId ? { ...proj, bullets: [...proj.bullets, ''] } : proj
      ),
    });
  };

  const updateProjectBullet = (projId: string, index: number, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: profile.projects.map((proj) =>
        proj.id === projId
          ? {
              ...proj,
              bullets: proj.bullets.map((b, i) => (i === index ? value : b)),
            }
          : proj
      ),
    });
  };

  const removeProjectBullet = (projId: string, index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: profile.projects.map((proj) =>
        proj.id === projId
          ? { ...proj, bullets: proj.bullets.filter((_, i) => i !== index) }
          : proj
      ),
    });
  };

  // Skills handlers
  const addSkillCategory = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: [...profile.skills, { category: '', items: [] }],
    });
  };

  const updateSkillCategory = (index: number, category: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.map((skill, i) =>
        i === index ? { ...skill, category } : skill
      ),
    });
  };

  const updateSkillItems = (index: number, items: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.map((skill, i) =>
        i === index
          ? { ...skill, items: items.split(',').map((s) => s.trim()) }
          : skill
      ),
    });
  };

  const removeSkillCategory = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter((_, i) => i !== index),
    });
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          {saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>

      {/* Resume Upload Section */}
      <section className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black">Resumes</h2>
          <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            {uploading || parsing ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {parsing ? 'Parsing...' : 'Uploading...'}
              </span>
            ) : (
              'Upload Resume (PDF)'
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleResumeUpload}
              className="hidden"
              disabled={uploading || parsing}
            />
          </label>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Upload your resume PDFs. When uploaded, the resume will be automatically
          parsed and new information will be added to your profile. Duplicate
          entries are automatically detected and skipped.
        </p>

        {mergeResult && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">
              Resume parsed successfully!
            </h3>
            <div className="text-sm text-green-700 space-y-1">
              <p>
                <strong>Added:</strong>{' '}
                {mergeResult.added.education} education,{' '}
                {mergeResult.added.experience} experience,{' '}
                {mergeResult.added.projects} projects,{' '}
                {mergeResult.added.skills} skills
              </p>
              <p>
                <strong>Skipped (duplicates):</strong>{' '}
                {mergeResult.skipped.education} education,{' '}
                {mergeResult.skipped.experience} experience,{' '}
                {mergeResult.skipped.projects} projects,{' '}
                {mergeResult.skipped.skills} skills
              </p>
            </div>
          </div>
        )}

        {(!profile.resumeFiles || profile.resumeFiles.length === 0) ? (
          <p className="text-gray-500 text-sm">
            No resumes uploaded yet. Upload a PDF to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {profile.resumeFiles.map((resume) => (
              <div
                key={resume.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                    <path d="M8 12h8v2H8zm0 4h8v2H8z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">{resume.name}</p>
                    <p className="text-xs text-gray-500">
                      {resume.fileName} &bull;{' '}
                      {new Date(resume.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadResume(resume)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => deleteResumeFile(resume.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Basic Information */}
      <section className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-black">Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={profile.basics.firstName}
              onChange={(e) => updateBasics('firstName', e.target.value)}
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={profile.basics.lastName}
              onChange={(e) => updateBasics('lastName', e.target.value)}
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={profile.basics.email}
              onChange={(e) => updateBasics('email', e.target.value)}
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={profile.basics.phone}
              onChange={(e) => updateBasics('phone', e.target.value)}
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={profile.basics.streetAddress}
              onChange={(e) => updateBasics('streetAddress', e.target.value)}
              placeholder="123 Main St"
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address Line 2 (optional)
            </label>
            <input
              type="text"
              value={profile.basics.streetAddress2 || ''}
              onChange={(e) => updateBasics('streetAddress2', e.target.value)}
              placeholder="Apt, Suite, Unit, etc."
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={profile.basics.city}
              onChange={(e) => updateBasics('city', e.target.value)}
              placeholder="San Diego"
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State / Province
            </label>
            <input
              type="text"
              value={profile.basics.state}
              onChange={(e) => updateBasics('state', e.target.value)}
              placeholder="CA"
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP / Postal Code
            </label>
            <input
              type="text"
              value={profile.basics.zipCode}
              onChange={(e) => updateBasics('zipCode', e.target.value)}
              placeholder="92101"
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={profile.basics.country}
              onChange={(e) => updateBasics('country', e.target.value)}
              placeholder="United States"
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn
            </label>
            <input
              type="url"
              value={profile.basics.linkedin || ''}
              onChange={(e) => updateBasics('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub
            </label>
            <input
              type="url"
              value={profile.basics.github || ''}
              onChange={(e) => updateBasics('github', e.target.value)}
              placeholder="https://github.com/..."
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              value={profile.basics.website || ''}
              onChange={(e) => updateBasics('website', e.target.value)}
              placeholder="https://..."
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
        </div>
      </section>

      {/* Education */}
      <section className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black">Education</h2>
          <button
            onClick={addEducation}
            className="px-4 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded cursor-pointer text-black"
          >
            Add Education
          </button>
        </div>
        {profile.education.length === 0 ? (
          <p className="text-gray-500 text-sm">No education entries yet.</p>
        ) : (
          <div className="space-y-4">
            {profile.education.map((edu) => (
              <div
                key={edu.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Institution
                    </label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) =>
                        updateEducation(edu.id, 'institution', e.target.value)
                      }
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Degree
                    </label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) =>
                        updateEducation(edu.id, 'degree', e.target.value)
                      }
                      placeholder="B.S., M.S., etc."
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field of Study
                    </label>
                    <input
                      type="text"
                      value={edu.field}
                      onChange={(e) =>
                        updateEducation(edu.id, 'field', e.target.value)
                      }
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="text"
                      value={edu.startDate}
                      onChange={(e) =>
                        updateEducation(edu.id, 'startDate', e.target.value)
                      }
                      placeholder="Sep 2020"
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="text"
                      value={edu.endDate}
                      onChange={(e) =>
                        updateEducation(edu.id, 'endDate', e.target.value)
                      }
                      placeholder="Jun 2024 or Expected Jun 2024"
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GPA (optional)
                    </label>
                    <input
                      type="text"
                      value={edu.gpa || ''}
                      onChange={(e) =>
                        updateEducation(edu.id, 'gpa', e.target.value)
                      }
                      placeholder="3.8/4.0"
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeEducation(edu.id)}
                  className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Experience */}
      <section className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black">Experience</h2>
          <button
            onClick={addExperience}
            className="px-4 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded cursor-pointer text-black"
          >
            Add Experience
          </button>
        </div>
        {profile.experience.length === 0 ? (
          <p className="text-gray-500 text-sm">No experience entries yet.</p>
        ) : (
          <div className="space-y-4">
            {profile.experience.map((exp) => (
              <div
                key={exp.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) =>
                        updateExperience(exp.id, 'company', e.target.value)
                      }
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) =>
                        updateExperience(exp.id, 'title', e.target.value)
                      }
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={exp.location}
                      onChange={(e) =>
                        updateExperience(exp.id, 'location', e.target.value)
                      }
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e) =>
                          updateExperience(exp.id, 'current', e.target.checked)
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">
                        Currently working here
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="text"
                      value={exp.startDate}
                      onChange={(e) =>
                        updateExperience(exp.id, 'startDate', e.target.value)
                      }
                      placeholder="Jun 2023"
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="text"
                      value={exp.endDate}
                      onChange={(e) =>
                        updateExperience(exp.id, 'endDate', e.target.value)
                      }
                      placeholder={exp.current ? 'Present' : 'Sep 2023'}
                      disabled={exp.current}
                      className="w-full p-2 border rounded-lg text-black bg-white disabled:bg-gray-100"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bullet Points
                  </label>
                  {exp.bullets.map((bullet, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) =>
                          updateBullet(exp.id, index, e.target.value)
                        }
                        placeholder="Describe your achievement..."
                        className="flex-1 p-2 border rounded-lg text-black bg-white"
                      />
                      <button
                        onClick={() => removeBullet(exp.id, index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addBullet(exp.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    + Add bullet point
                  </button>
                </div>
                <button
                  onClick={() => removeExperience(exp.id)}
                  className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                >
                  Remove Experience
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Projects */}
      <section className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black">Projects</h2>
          <button
            onClick={addProject}
            className="px-4 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded cursor-pointer text-black"
          >
            Add Project
          </button>
        </div>
        {profile.projects.length === 0 ? (
          <p className="text-gray-500 text-sm">No projects yet.</p>
        ) : (
          <div className="space-y-4">
            {profile.projects.map((proj) => (
              <div
                key={proj.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) =>
                        updateProject(proj.id, 'name', e.target.value)
                      }
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link (optional)
                    </label>
                    <input
                      type="url"
                      value={proj.link || ''}
                      onChange={(e) =>
                        updateProject(proj.id, 'link', e.target.value)
                      }
                      placeholder="https://github.com/..."
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={proj.description}
                      onChange={(e) =>
                        updateProject(proj.id, 'description', e.target.value)
                      }
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Technologies (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={proj.technologies.join(', ')}
                      onChange={(e) =>
                        updateProject(
                          proj.id,
                          'technologies',
                          e.target.value.split(',').map((s) => s.trim())
                        )
                      }
                      placeholder="React, TypeScript, Node.js"
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bullet Points
                  </label>
                  {proj.bullets.map((bullet, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) =>
                          updateProjectBullet(proj.id, index, e.target.value)
                        }
                        placeholder="Describe your work..."
                        className="flex-1 p-2 border rounded-lg text-black bg-white"
                      />
                      <button
                        onClick={() => removeProjectBullet(proj.id, index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addProjectBullet(proj.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    + Add bullet point
                  </button>
                </div>
                <button
                  onClick={() => removeProject(proj.id)}
                  className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                >
                  Remove Project
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Skills */}
      <section className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black">Skills</h2>
          <button
            onClick={addSkillCategory}
            className="px-4 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded cursor-pointer text-black"
          >
            Add Category
          </button>
        </div>
        {profile.skills.length === 0 ? (
          <p className="text-gray-500 text-sm">No skills added yet.</p>
        ) : (
          <div className="space-y-4">
            {profile.skills.map((skill, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={skill.category}
                      onChange={(e) =>
                        updateSkillCategory(index, e.target.value)
                      }
                      placeholder="Languages, Frameworks, Tools..."
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={skill.items.join(', ')}
                      onChange={(e) => updateSkillItems(index, e.target.value)}
                      placeholder="Python, JavaScript, TypeScript..."
                      className="w-full p-2 border rounded-lg text-black bg-white"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeSkillCategory(index)}
                  className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Application Preferences */}
      <section className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-black">Application Preferences</h2>
        <p className="text-sm text-gray-600 mb-4">
          Common questions asked on job applications. These will be auto-filled by the extension.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How did you hear about this job?
            </label>
            <select
              value={profile.applicationPreferences?.jobSource || 'LinkedIn'}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    jobSource: e.target.value,
                  },
                })
              }
              className="w-full p-2 border rounded-lg text-black bg-white"
            >
              <option value="LinkedIn">LinkedIn</option>
              <option value="Indeed">Indeed</option>
              <option value="Glassdoor">Glassdoor</option>
              <option value="Company Website">Company Website</option>
              <option value="Referral">Referral</option>
              <option value="Job Fair">Job Fair</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Citizenship / Nationality
            </label>
            <input
              type="text"
              value={profile.applicationPreferences?.citizenship || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    citizenship: e.target.value,
                  },
                })
              }
              placeholder="e.g., United States"
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <input
              type="checkbox"
              id="isOver18"
              checked={profile.applicationPreferences?.isOver18 ?? true}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    isOver18: e.target.checked,
                  },
                })
              }
              className="w-4 h-4"
            />
            <label htmlFor="isOver18" className="text-sm text-gray-700 cursor-pointer">
              I am 18 years of age or older
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <input
              type="checkbox"
              id="isAuthorizedToWork"
              checked={profile.applicationPreferences?.isAuthorizedToWork ?? true}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    isAuthorizedToWork: e.target.checked,
                  },
                })
              }
              className="w-4 h-4"
            />
            <label htmlFor="isAuthorizedToWork" className="text-sm text-gray-700 cursor-pointer">
              I am legally authorized to work in this country
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <input
              type="checkbox"
              id="requiresSponsorship"
              checked={profile.applicationPreferences?.requiresSponsorship ?? false}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    requiresSponsorship: e.target.checked,
                  },
                })
              }
              className="w-4 h-4"
            />
            <label htmlFor="requiresSponsorship" className="text-sm text-gray-700 cursor-pointer">
              I require visa sponsorship now or in the future
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <input
              type="checkbox"
              id="willingToRelocate"
              checked={profile.applicationPreferences?.willingToRelocate ?? false}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    willingToRelocate: e.target.checked,
                  },
                })
              }
              className="w-4 h-4"
            />
            <label htmlFor="willingToRelocate" className="text-sm text-gray-700 cursor-pointer">
              I am willing to relocate
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desired Salary (optional)
            </label>
            <input
              type="text"
              value={profile.applicationPreferences?.desiredSalary || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    desiredSalary: e.target.value,
                  },
                })
              }
              placeholder="e.g., $80,000 - $100,000"
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Start Date
            </label>
            <input
              type="text"
              value={profile.applicationPreferences?.availableStartDate || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    availableStartDate: e.target.value,
                  },
                })
              }
              placeholder="e.g., Immediately, 2 weeks notice"
              className="w-full p-2 border rounded-lg text-black bg-white"
            />
          </div>
        </div>

        <h3 className="text-lg font-medium mt-6 mb-3 text-black">
          Voluntary Self-Identification (EEO)
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          These questions are optional and used for diversity reporting. Your responses will not affect your application.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              value={profile.applicationPreferences?.gender || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    gender: e.target.value,
                  },
                })
              }
              className="w-full p-2 border rounded-lg text-black bg-white"
            >
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ethnicity
            </label>
            <select
              value={profile.applicationPreferences?.ethnicity || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    ethnicity: e.target.value,
                  },
                })
              }
              className="w-full p-2 border rounded-lg text-black bg-white"
            >
              <option value="">Prefer not to say</option>
              <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
              <option value="Asian">Asian</option>
              <option value="Black or African American">Black or African American</option>
              <option value="Hispanic or Latino">Hispanic or Latino</option>
              <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
              <option value="White">White</option>
              <option value="Two or More Races">Two or More Races</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Veteran Status
            </label>
            <select
              value={profile.applicationPreferences?.veteranStatus || 'I am not a protected veteran'}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    veteranStatus: e.target.value,
                  },
                })
              }
              className="w-full p-2 border rounded-lg text-black bg-white"
            >
              <option value="I am not a protected veteran">I am not a protected veteran</option>
              <option value="I am a protected veteran">I am a protected veteran</option>
              <option value="I do not wish to answer">I do not wish to answer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disability Status
            </label>
            <select
              value={profile.applicationPreferences?.disabilityStatus || 'I do not wish to answer'}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  applicationPreferences: {
                    ...profile.applicationPreferences,
                    disabilityStatus: e.target.value,
                  },
                })
              }
              className="w-full p-2 border rounded-lg text-black bg-white"
            >
              <option value="I do not wish to answer">I do not wish to answer</option>
              <option value="Yes, I have a disability">Yes, I have a disability</option>
              <option value="No, I do not have a disability">No, I do not have a disability</option>
            </select>
          </div>
        </div>
      </section>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          {saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>
    </main>
  );
}
