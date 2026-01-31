// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse');
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);
    const rawText = data.text;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `Convert this resume text into clean, compilable LaTeX code. Use a professional single-column resume format.

Resume text:
${rawText}

Requirements:
- Use standard LaTeX packages (geometry, enumitem, hyperref, titlesec)
- Keep it to one page with appropriate margins
- Use consistent formatting for sections
- Include all content from the original resume
- Make sure the LaTeX compiles without errors

Return ONLY the LaTeX code, no markdown code blocks or explanations.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    let latex = content.text;
    // Strip markdown code blocks if present
    latex = latex.replace(/^```(?:latex|tex)?\n?/i, '').replace(/\n?```$/i, '');

    return NextResponse.json({ latex });
  } catch (error) {
    console.error('PDF to LaTeX error:', error);
    return NextResponse.json({ error: 'Failed to convert PDF to LaTeX' }, { status: 500 });
  }
}
