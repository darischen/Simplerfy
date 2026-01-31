'use client';

import { useState } from 'react';
import {
  JobApplication,
  getApplications,
  saveApplication,
  deleteApplication,
} from '@/lib/storage';

const STATUSES = [
  'saved',
  'applied',
  'screening',
  'interviewing',
  'offer',
  'rejected',
] as const;

type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<Status, string> = {
  saved: 'bg-gray-100 text-gray-700',
  applied: 'bg-blue-100 text-blue-700',
  screening: 'bg-yellow-100 text-yellow-700',
  interviewing: 'bg-purple-100 text-purple-700',
  offer: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function getInitialApplications(): JobApplication[] {
  if (typeof window === 'undefined') return [];
  return getApplications();
}

export default function TrackerPage() {
  const [applications, setApplications] = useState<JobApplication[]>(getInitialApplications);
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'status'>('date');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New application form state
  const [newApp, setNewApp] = useState({
    company: '',
    title: '',
    url: '',
    status: 'saved' as Status,
    notes: '',
    jobDescription: '',
  });

  const refreshApplications = () => {
    setApplications(getApplications());
  };

  const handleAddApplication = () => {
    if (!newApp.company || !newApp.title) return;

    const application: JobApplication = {
      id: crypto.randomUUID(),
      company: newApp.company,
      title: newApp.title,
      url: newApp.url || undefined,
      status: newApp.status,
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: newApp.notes || undefined,
      jobDescription: newApp.jobDescription || undefined,
    };

    saveApplication(application);
    refreshApplications();
    setShowAddModal(false);
    setNewApp({
      company: '',
      title: '',
      url: '',
      status: 'saved',
      notes: '',
      jobDescription: '',
    });
  };

  const handleUpdateStatus = (id: string, status: Status) => {
    const app = applications.find((a) => a.id === id);
    if (!app) return;

    saveApplication({
      ...app,
      status,
      updatedAt: new Date().toISOString(),
    });
    refreshApplications();
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this application?')) {
      deleteApplication(id);
      refreshApplications();
    }
  };

  // Filter and sort applications
  const filteredApps = applications
    .filter((app) => filterStatus === 'all' || app.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'company') {
        return a.company.localeCompare(b.company);
      }
      if (sortBy === 'status') {
        return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
      }
      return 0;
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Applications</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Add Application
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Filter by Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Status | 'all')}
            className="p-2 border rounded-lg text-black bg-white"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'company' | 'status')}
            className="p-2 border rounded-lg text-black bg-white"
          >
            <option value="date">Date Updated</option>
            <option value="company">Company</option>
            <option value="status">Status</option>
          </select>
        </div>
        <div className="flex items-end">
          <p className="text-sm text-white pb-2">
            {filteredApps.length} application{filteredApps.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {filteredApps.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            {applications.length === 0
              ? 'No applications yet. Click "Add Application" to get started.'
              : 'No applications match the current filter.'}
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700">Company</th>
                <th className="text-left p-4 font-medium text-gray-700">Position</th>
                <th className="text-left p-4 font-medium text-gray-700">Status</th>
                <th className="text-left p-4 font-medium text-gray-700">Updated</th>
                <th className="text-right p-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-gray-900">{app.company}</p>
                      {app.url && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View posting
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-gray-900">{app.title}</td>
                  <td className="p-4">
                    {editingId === app.id ? (
                      <select
                        value={app.status}
                        onChange={(e) => handleUpdateStatus(app.id, e.target.value as Status)}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                        className="p-1 border rounded text-sm text-black bg-white"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(app.id)}
                        className={`px-2 py-1 text-xs rounded-full cursor-pointer ${STATUS_COLORS[app.status]}`}
                      >
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-gray-500 text-sm">{formatDate(app.updatedAt)}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="text-red-600 hover:text-red-700 text-sm cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold mb-4">Add Application</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company *
                </label>
                <input
                  type="text"
                  value={newApp.company}
                  onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
                  className="w-full p-2 border rounded-lg text-black bg-white"
                  placeholder="Google, Meta, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <input
                  type="text"
                  value={newApp.title}
                  onChange={(e) => setNewApp({ ...newApp, title: e.target.value })}
                  className="w-full p-2 border rounded-lg text-black bg-white"
                  placeholder="Software Engineer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Posting URL
                </label>
                <input
                  type="url"
                  value={newApp.url}
                  onChange={(e) => setNewApp({ ...newApp, url: e.target.value })}
                  className="w-full p-2 border rounded-lg text-black bg-white"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newApp.status}
                  onChange={(e) => setNewApp({ ...newApp, status: e.target.value as Status })}
                  className="w-full p-2 border rounded-lg text-black bg-white"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newApp.notes}
                  onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg text-black bg-white h-20"
                  placeholder="Any notes about this application..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Description
                </label>
                <textarea
                  value={newApp.jobDescription}
                  onChange={(e) => setNewApp({ ...newApp, jobDescription: e.target.value })}
                  className="w-full p-2 border rounded-lg text-black bg-white h-24"
                  placeholder="Paste job description for later reference..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewApp({
                    company: '',
                    title: '',
                    url: '',
                    status: 'saved',
                    notes: '',
                    jobDescription: '',
                  });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddApplication}
                disabled={!newApp.company || !newApp.title}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Add Application
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
