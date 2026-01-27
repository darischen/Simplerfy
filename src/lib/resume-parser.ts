// Import pdf-parse core directly to avoid test file loading bug
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse');
import Anthropic from '@anthropic-ai/sdk';
import { ResumeData } from '@/types/resume';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function parseResumeFromPDF(buffer: Buffer): Promise<ResumeData> {
  // Extract text from PDF
  const data = await pdfParse(buffer);
  const rawText = data.text;

  // Use Claude to structure the resume
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Extract the following resume into a structured JSON format. Be precise and preserve all details.

Resume text:
${rawText}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "basics": {
    "name": string,
    "email": string,
    "phone": string,
    "location": string,
    "linkedin": string or null,
    "github": string or null,
    "website": string or null
  },
  "education": [{
    "institution": string,
    "degree": string,
    "field": string,
    "graduationDate": string,
    "gpa": string or null,
    "relevantCourses": string[] or null
  }],
  "experience": [{
    "company": string,
    "title": string,
    "location": string,
    "startDate": string,
    "endDate": string,
    "bullets": string[],
    "tags": string[] (infer relevant tech/skills from bullets)
  }],
  "projects": [{
    "name": string,
    "description": string (one sentence summary),
    "bullets": string[],
    "technologies": string[],
    "link": string or null
  }],
  "skills": [{
    "category": string,
    "items": string[]
  }]
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return JSON.parse(content.text) as ResumeData;
}