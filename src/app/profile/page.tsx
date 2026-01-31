'use client';

import { useState } from 'react';
import {
  UserProfile,
  getProfile,
  saveProfile,
  createEmptyProfile,
} from '@/lib/storage';

function getInitialProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return createEmptyProfile();
  }
  return getProfile() || createEmptyProfile();
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(getInitialProfile);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (profile) {
      saveProfile(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
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
              Location
            </label>
            <input
              type="text"
              value={profile.basics.location}
              onChange={(e) => updateBasics('location', e.target.value)}
              placeholder="City, State"
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
