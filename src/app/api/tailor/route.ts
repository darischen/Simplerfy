import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ResumeData } from '@/types/resume';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { resume, jobDescription } = await request.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Resume and job description are required' },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are an expert resume tailor. Your job is to modify a resume to better match a job description while keeping all information truthful.

## Job Description:
${jobDescription}

## Current Resume (JSON):
${JSON.stringify(resume, null, 2)}

## Instructions:
1. Analyze the job description for key requirements, skills, and keywords
2. Rewrite 3-5 experience bullets to better highlight relevant skills and use keywords from the job description
3. Reorder experience bullets within each job to put most relevant ones first
4. Reorder projects to put most relevant ones first
5. Keep all facts truthful - only rephrase, don't fabricate
6. Update skill categories if needed to emphasize relevant skills

Return ONLY the modified resume as valid JSON matching the exact same schema. No explanation, no markdown, just JSON.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const tailoredResume: ResumeData = JSON.parse(content.text);

    return NextResponse.json({ tailoredResume });
  } catch (error) {
    console.error('Tailor error:', error);
    return NextResponse.json(
      { error: 'Failed to tailor resume' },
      { status: 500 }
    );
  }
}