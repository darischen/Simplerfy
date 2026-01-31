import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic();

export async function POST(request: Request) {
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
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an expert recruiter and resume analyst. Analyze how well this resume matches the job description.

## Resume (LaTeX format)
${resume}

## Job Description
${jobDescription}

## Instructions
Provide a match analysis in the following JSON format:
{
  "score": <number 0-100>,
  "summary": "<one sentence summary of the match>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "gaps": ["<gap 1>", "<gap 2>", ...],
  "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>", ...]
}

Scoring guidelines:
- 90-100: Excellent match, candidate exceeds requirements
- 75-89: Strong match, candidate meets most requirements
- 60-74: Moderate match, candidate meets some requirements
- 40-59: Weak match, significant gaps exist
- 0-39: Poor match, candidate lacks most requirements

Be specific and actionable in your suggestions. Focus on:
- Keywords from the job description that are missing
- Skills that could be highlighted better
- Experience that could be reframed to match requirements

Return ONLY the JSON object, no other text.`,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    const responseText = textContent ? textContent.text : '';

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse score response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error scoring resume:', error);
    return NextResponse.json(
      { error: 'Failed to score resume' },
      { status: 500 }
    );
  }
}
