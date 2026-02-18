'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getProfile, UserProfile } from '@/lib/storage';

const QUESTION_TYPES = [
  { id: 'fit', label: 'Why are you a good fit for this role?' },
  { id: 'about', label: 'Tell me about yourself' },
  { id: 'company', label: 'Why do you want to work at this company?' },
  { id: 'strength', label: 'What is your greatest strength?' },
  { id: 'challenge', label: 'Describe a challenge you overcame' },
  { id: 'custom', label: 'Custom question...' },
] as const;

function getInitialProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  return getProfile();
}

export default function AnswersPage() {
  const [profile] = useState<UserProfile | null>(getInitialProfile);
  const [jobDescription, setJobDescription] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<string>('fit');
  const [customQuestion, setCustomQuestion] = useState('');
  const [generatedAnswer, setGeneratedAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasProfile = profile && profile.basics.firstName;

  const getQuestionText = () => {
    if (selectedQuestion === 'custom') {
      return customQuestion;
    }
    return QUESTION_TYPES.find((q) => q.id === selectedQuestion)?.label || '';
  };

  const handleGenerate = async () => {
    if (!profile || !jobDescription || !getQuestionText()) return;

    setLoading(true);
    setError(null);
    setGeneratedAnswer('');

    try {
      const response = await fetch('/api/generate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          jobDescription,
          question: getQuestionText(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate answer');
      }

      const data = await response.json();
      setGeneratedAnswer(data.answer);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }

    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasProfile) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Generate Answers</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            Profile Required
          </h2>
          <p className="text-yellow-700 mb-4">
            To generate personalized answers, you need to set up your profile first.
            Your profile information will be used to craft relevant responses.
          </p>
          <Link
            href="/profile"
            className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Set Up Profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Generate Answers</h1>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Job Description */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Job Description</h2>
          <textarea
            className="w-full flex-1 min-h-100 p-4 border rounded-lg font-mono text-sm text-black bg-white"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>

        {/* Question Selection */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Question</h2>
          <div className="space-y-2">
            {QUESTION_TYPES.map((q) => (
              <label
                key={q.id}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedQuestion === q.id
                    ? 'border-blue-600 bg-blue-100'
                    : 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <input
                  type="radio"
                  name="question"
                  value={q.id}
                  checked={selectedQuestion === q.id}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-900">{q.label}</span>
              </label>
            ))}
          </div>

          <textarea
            className={`w-full h-24 p-3 border rounded-lg text-black bg-white ${
              selectedQuestion === 'custom' ? '' : 'opacity-50'
            }`}
            placeholder="Enter your custom question..."
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            disabled={selectedQuestion !== 'custom'}
          />
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !jobDescription || (selectedQuestion === 'custom' && !customQuestion)}
        className="w-full py-3 mb-8 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating...' : 'Generate Answer'}
      </button>

      {error && (
        <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Generated Answer */}
      {generatedAnswer && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-black font-semibold">Generated Answer</h2>
            <button
              onClick={handleCopy}
              className="px-4 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded cursor-pointer text-black"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-800 whitespace-pre-wrap">{generatedAnswer}</p>
          </div>
        </div>
      )}

      {/* Profile Preview */}
      <div className="mt-8 p-4 bg-gray-50 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-700">Using profile:</h3>
          <Link href="/profile" className="text-sm text-blue-600 hover:underline">
            Edit profile
          </Link>
        </div>
        <p className="text-sm text-gray-600">
          {profile.basics.firstName} {profile.basics.lastName}
          {profile.experience.length > 0 && (
            <span>
              {' '}
              - {profile.experience[0].title} at {profile.experience[0].company}
            </span>
          )}
          {profile.education.length > 0 && (
            <span>
              {' '}
              | {profile.education[0].degree} from {profile.education[0].institution}
            </span>
          )}
        </p>
      </div>
    </main>
  );
}
