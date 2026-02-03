import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { latex, jobDescription } = await request.json();

    if (!latex || !jobDescription) {
      return NextResponse.json(
        { error: 'LaTeX and job description are required' },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `You are an expert resume tailor. Your job is to modify a LaTeX resume to better match a job description while keeping all information truthful.

## Job Description:
${jobDescription}

## Current Resume (LaTeX):
${latex}

## Instructions:
1. Analyze the job description for key requirements, skills, and keywords
2. ONLY modify Experience and Project descriptions/bullet points - rewrite them to better highlight relevant skills and use keywords from the job description
3. Reorder experience bullets within each job to put most relevant ones first
4. Reorder projects to put most relevant ones first
5. Keep all facts truthful - only rephrase, don't fabricate
6. DO NOT change the Technical Skills section at all - keep it exactly as is
7. DO NOT change contact information, education, or any other sections
8. IMPORTANT: Keep the exact same LaTeX structure, formatting, and commands. Only modify experience and project text content.
9. CRITICAL: The resume MUST fit on ONE PAGE. To achieve this:
   - Be concise - shorten bullet points while keeping impact
   - Remove or condense less relevant experiences/projects
   - Prioritize quality over quantity - fewer strong bullets are better than many weak ones
   - Remove redundant information
   - If needed, remove the least relevant job experience or project entirely
   - However, it is important that it fills up as much space inside the ONE page as possible. If there is space to add more content, then add it.

Return ONLY the modified LaTeX code. No explanation, no markdown code blocks, just the raw LaTeX.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Clean up response in case Claude wrapped it in code blocks
    let tailoredLatex = content.text.trim();
    if (tailoredLatex.startsWith('```latex')) {
      tailoredLatex = tailoredLatex.slice(8);
    } else if (tailoredLatex.startsWith('```')) {
      tailoredLatex = tailoredLatex.slice(3);
    }
    if (tailoredLatex.endsWith('```')) {
      tailoredLatex = tailoredLatex.slice(0, -3);
    }
    tailoredLatex = tailoredLatex.trim();

    return NextResponse.json({ tailoredLatex });
  } catch (error) {
    console.error('Tailor error:', error);
    return NextResponse.json(
      { error: 'Failed to tailor resume' },
      { status: 500 }
    );
  }
}
