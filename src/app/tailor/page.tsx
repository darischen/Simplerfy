'use client';

import { useState, useRef } from 'react';

interface ScoreResult {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
}

export default function TailorPage() {
  const [latex, setLatex] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [originalPdf, setOriginalPdf] = useState<string | null>(null);
  const [tailoredPdf, setTailoredPdf] = useState<string | null>(null);
  const [tailoredLatex, setTailoredLatex] = useState<string | null>(null);
  const [originalScore, setOriginalScore] = useState<ScoreResult | null>(null);
  const [tailoredScore, setTailoredScore] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compileLaTeX = async (latexContent: string): Promise<string> => {
    const response = await fetch('/api/compile-latex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latex: latexContent }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Compilation failed');
    }

    const data = await response.json();
    return data.pdf;
  };

  const scoreResume = async (resume: string): Promise<ScoreResult> => {
    const response = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, jobDescription }),
    });

    if (!response.ok) {
      throw new Error('Failed to score resume');
    }

    return response.json();
  };

  const handleTailor = async () => {
    if (!latex || !jobDescription) return;

    setLoading(true);
    setError(null);
    setOriginalPdf(null);
    setTailoredPdf(null);
    setOriginalScore(null);
    setTailoredScore(null);

    try {
      // Compile original LaTeX and score it in parallel
      const [originalPdfBase64, origScore] = await Promise.all([
        compileLaTeX(latex),
        scoreResume(latex),
      ]);
      setOriginalPdf(originalPdfBase64);
      setOriginalScore(origScore);

      // Tailor the LaTeX
      const tailorResponse = await fetch('/api/tailor-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex, jobDescription }),
      });

      if (!tailorResponse.ok) {
        throw new Error('Failed to tailor resume');
      }

      const tailorData = await tailorResponse.json();
      setTailoredLatex(tailorData.tailoredLatex);

      // Compile tailored LaTeX and score it in parallel
      const [tailoredPdfBase64, tailScore] = await Promise.all([
        compileLaTeX(tailorData.tailoredLatex),
        scoreResume(tailorData.tailoredLatex),
      ]);
      setTailoredPdf(tailoredPdfBase64);
      setTailoredScore(tailScore);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }

    setLoading(false);
  };

  const copyTailoredLatex = () => {
    if (tailoredLatex) {
      navigator.clipboard.writeText(tailoredLatex);
    }
  };

  const downloadTailoredPdf = () => {
    if (tailoredPdf) {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${tailoredPdf}`;
      link.download = 'tailored-resume.pdf';
      link.click();
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/pdf-to-latex', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }

      const data = await response.json();
      setLatex(data.latex);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse PDF');
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 border-green-300';
    if (score >= 75) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    if (score >= 40) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const ScoreCard = ({ score, label }: { score: ScoreResult; label: string }) => (
    <div className={`p-4 rounded-lg border ${getScoreBgColor(score.score)}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">{label}</h3>
        <span className={`text-3xl font-bold ${getScoreColor(score.score)}`}>
          {score.score}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{score.summary}</p>

      {score.strengths.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-green-700 mb-1">Strengths:</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {score.strengths.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-start">
                <span className="text-green-500 mr-1">+</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.gaps.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-red-700 mb-1">Gaps:</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {score.gaps.slice(0, 3).map((g, i) => (
              <li key={i} className="flex items-start">
                <span className="text-red-500 mr-1">-</span> {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-blue-700 mb-1">Suggestions:</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {score.suggestions.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-start">
                <span className="text-blue-500 mr-1">→</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Tailor Resume</h1>

      {/* Input Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* LaTeX Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">LaTeX Resume</h2>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePdfUpload}
                accept=".pdf"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded cursor-pointer text-black disabled:opacity-50"
              >
                {uploading ? 'Parsing...' : 'Upload PDF'}
              </button>
            </div>
          </div>
          <textarea
            className="w-full h-64 p-4 border rounded-lg font-mono text-sm text-black bg-white"
            placeholder="Paste your LaTeX resume code here..."
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
          />
        </div>

        {/* Job Description Input */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Job Description</h2>
          <textarea
            className="w-full h-64 p-4 border rounded-lg font-mono text-sm text-black bg-white"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Tailor Button */}
      <button
        onClick={handleTailor}
        disabled={loading || !latex || !jobDescription}
        className="w-full py-3 mb-8 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Tailoring & Scoring...' : 'Tailor Resume'}
      </button>

      {error && (
        <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Score Comparison */}
      {(originalScore || tailoredScore) && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Match Score Comparison</h2>
          <div className="grid grid-cols-2 gap-8">
            {originalScore && (
              <ScoreCard score={originalScore} label="Original Resume" />
            )}
            {tailoredScore && (
              <div className="relative">
                {originalScore && tailoredScore.score > originalScore.score && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    +{tailoredScore.score - originalScore.score} pts
                  </div>
                )}
                <ScoreCard score={tailoredScore} label="Tailored Resume" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Comparison Section */}
      <div className="grid grid-cols-2 gap-8">
        {/* Original PDF */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Original Resume</h2>
          <div className="h-[800px] border rounded-lg overflow-hidden bg-gray-100">
            {originalPdf ? (
              <iframe
                src={`data:application/pdf;base64,${originalPdf}`}
                className="w-full h-full"
                title="Original Resume PDF"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Original PDF will appear here...
              </div>
            )}
          </div>
        </div>

        {/* Tailored PDF */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tailored Resume</h2>
            {tailoredLatex && (
              <div className="flex gap-2">
                <button
                  onClick={copyTailoredLatex}
                  className="px-4 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded cursor-pointer text-black"
                >
                  Copy LaTeX
                </button>
                <button
                  onClick={downloadTailoredPdf}
                  className="px-4 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded cursor-pointer text-black"
                >
                  Download PDF
                </button>
              </div>
            )}
          </div>
          <div className="h-[800px] border rounded-lg overflow-hidden bg-gray-100">
            {tailoredPdf ? (
              <iframe
                src={`data:application/pdf;base64,${tailoredPdf}`}
                className="w-full h-full"
                title="Tailored Resume PDF"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Tailored PDF will appear here...
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
