// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse');
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ParsedResume {
  basics: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  education: {
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }[];
  experience: {
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }[];
  projects: {
    name: string;
    description: string;
    bullets: string[];
    technologies: string[];
    link?: string;
    startDate?: string;
    endDate?: string;
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
}

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
          content: `Parse this resume text and extract structured data. Return ONLY valid JSON with no markdown formatting.

Resume text:
${rawText}

Return a JSON object with this exact structure:
{
  "basics": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "location": "string (city, state format)",
    "linkedin": "string or null",
    "github": "string or null",
    "website": "string or null"
  },
  "education": [
    {
      "institution": "string (full school name)",
      "degree": "string (B.S., M.S., B.A., etc.)",
      "field": "string (major/field of study)",
      "startDate": "string (Mon YYYY format)",
      "endDate": "string (Mon YYYY or Expected Mon YYYY)",
      "gpa": "string or null (e.g., 3.8/4.0)"
    }
  ],
  "experience": [
    {
      "company": "string",
      "title": "string",
      "location": "string",
      "startDate": "string (Mon YYYY format)",
      "endDate": "string (Mon YYYY or Present)",
      "current": boolean,
      "bullets": ["string array of achievements/responsibilities"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string (brief one-line description)",
      "bullets": ["string array of details"],
      "technologies": ["string array of tech used"],
      "link": "string or null",
      "startDate": "string (Mon YYYY format) or null",
      "endDate": "string (Mon YYYY format) or null"
    }
  ],
  "skills": [
    {
      "category": "string (e.g., Languages, Frameworks, Tools)",
      "items": ["string array of skills"]
    }
  ]
}

Important:
- Extract ALL information from the resume
- For dates, use "Mon YYYY" format (e.g., "Sep 2023")
- If a job is current, set "current": true and "endDate": "Present"
- Split name into firstName and lastName
- Group skills by logical categories
- Return ONLY the JSON, no explanation or markdown`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    let jsonText = content.text;
    // Strip markdown code blocks if present
    jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');

    const parsed: ParsedResume = JSON.parse(jsonText);

    return NextResponse.json({ parsed });
  } catch (error) {
    console.error('Parse resume error:', error);
    return NextResponse.json(
      { error: 'Failed to parse resume' },
      { status: 500 }
    );
  }
}
