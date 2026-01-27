import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { latex } = await request.json();

    if (!latex) {
      return NextResponse.json(
        { error: 'LaTeX content is required' },
        { status: 400 }
      );
    }

    // Try latex.ytotech.com API first (more reliable)
    const response = await fetch('https://latex.ytotech.com/builds/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        compiler: 'pdflatex',
        resources: [
          {
            main: true,
            content: latex,
          },
        ],
      }),
    });

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok || !contentType.includes('application/pdf')) {
      const errorText = await response.text();
      console.error('LaTeX compilation error:', errorText);

      // Try to parse error details
      let errorMessage = 'LaTeX compilation failed';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.logs) {
          errorMessage = `Compilation error: ${errorJson.logs}`;
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        errorMessage = errorText || 'LaTeX compilation failed - check your LaTeX syntax';
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    const pdfBuffer = await response.arrayBuffer();
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    return NextResponse.json({ pdf: base64Pdf });
  } catch (error) {
    console.error('Compile error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compile LaTeX' },
      { status: 500 }
    );
  }
}
