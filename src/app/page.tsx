'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getProfile, getApplications, JobApplication } from '@/lib/storage';

function getInitialHasProfile(): boolean {
  if (typeof window === 'undefined') return false;
  const profile = getProfile();
  return !!profile?.basics.firstName;
}

function getInitialApplications(): JobApplication[] {
  if (typeof window === 'undefined') return [];
  return getApplications().slice(0, 5);
}

function getInitialStats() {
  if (typeof window === 'undefined') {
    return { total: 0, applied: 0, interviewing: 0, offers: 0 };
  }
  const apps = getApplications();
  return {
    total: apps.length,
    applied: apps.filter((a) => a.status === 'applied').length,
    interviewing: apps.filter((a) => ['screening', 'interviewing'].includes(a.status)).length,
    offers: apps.filter((a) => a.status === 'offer').length,
  };
}

export default function Dashboard() {
  const [hasProfile] = useState(getInitialHasProfile);
  const [applications] = useState(getInitialApplications);
  const [stats] = useState(getInitialStats);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {!hasProfile && (
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            Complete your profile to get started.{' '}
            <Link href="/profile" className="font-medium underline">
              Set up profile →
            </Link>
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-sm text-gray-500">Total Applications</p>
          <p className="text-3xl font-bold text-black">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-sm text-gray-500">Applied</p>
          <p className="text-3xl font-bold text-blue-600">{stats.applied}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-sm text-gray-500">Interviewing</p>
          <p className="text-3xl font-bold text-purple-600">{stats.interviewing}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-sm text-gray-500">Offers</p>
          <p className="text-3xl font-bold text-green-600">{stats.offers}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link
          href="/tailor"
          className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <h3 className="font-semibold text-lg">Tailor Resume</h3>
          <p className="text-blue-100 text-sm mt-1">Optimize your resume for a job</p>
        </Link>
        <Link
          href="/tracker"
          className="bg-white border p-6 rounded-lg hover:border-gray-300 transition-colors"
        >
          <h3 className="font-semibold text-lg text-gray-900">Track Application</h3>
          <p className="text-gray-500 text-sm mt-1">Log a new job application</p>
        </Link>
        <Link
          href="/answers"
          className="bg-white border p-6 rounded-lg hover:border-gray-300 transition-colors"
        >
          <h3 className="font-semibold text-lg text-gray-900">Generate Answers</h3>
          <p className="text-gray-500 text-sm mt-1">AI-powered application answers</p>
        </Link>
      </div>

      {/* Recent Applications */}
      <div className="bg-white border rounded-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-black">Recent Applications</h2>
          <Link href="/tracker" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        {applications.length === 0 ? (
          <p className="p-4 text-gray-500">No applications yet. Start by tailoring your resume!</p>
        ) : (
          <div className="divide-y">
            {applications.map((app) => (
              <div key={app.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{app.title}</p>
                  <p className="text-sm text-gray-700">{app.company}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    app.status === 'offer'
                      ? 'bg-green-100 text-green-700'
                      : app.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : app.status === 'interviewing'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
