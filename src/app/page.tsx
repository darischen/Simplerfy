'use client';

import { useState } from 'react';

export default function Home() {
  const [latex, setLatex] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [originalPdf, setOriginalPdf] = useState<string | null>(null);
  const [tailoredPdf, setTailoredPdf] = useState<string | null>(null);
  const [tailoredLatex, setTailoredLatex] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleTailor = async () => {
    if (!latex || !jobDescription) return;

    setLoading(true);
    setError(null);
    setOriginalPdf(null);
    setTailoredPdf(null);

    try {
      // Compile original LaTeX
      const originalPdfBase64 = await compileLaTeX(latex);
      setOriginalPdf(originalPdfBase64);

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

      // Compile tailored LaTeX
      const tailoredPdfBase64 = await compileLaTeX(tailorData.tailoredLatex);
      setTailoredPdf(tailoredPdfBase64);
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

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Simplerfy</h1>

      {/* Input Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* LaTeX Input */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">LaTeX Resume</h2>
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
        className="w-full py-3 mb-8 bg-blue-400 text-white rounded-lg cursor-pointer hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Tailoring...' : 'Tailor Resume'}
      </button>

      {error && (
        <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
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
