import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const { profile, jobDescription, question } = await request.json();

    if (!profile || !jobDescription || !question) {
      return NextResponse.json(
        { error: 'Profile, job description, and question are required' },
        { status: 400 }
      );
    }

    // Format profile data for the prompt
    const profileSummary = formatProfile(profile);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a career coach helping a job applicant craft a compelling answer to an application question.

## Applicant Profile
${profileSummary}

## Job Description
${jobDescription}

## Question to Answer
${question}

## Instructions
Write a professional, authentic answer to this question that:
1. Highlights relevant experience and skills from the applicant's profile
2. Connects their background to the specific job requirements
3. Shows enthusiasm without being over-the-top
4. Is concise (2-4 paragraphs, around 150-250 words)
5. Uses specific examples from their experience when possible
6. Sounds natural and conversational, not robotic

Write the answer in first person as if the applicant is speaking/writing it directly. Do not include any preamble or explanation - just write the answer itself.`,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    const answer = textContent ? textContent.text : '';

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error generating answer:', error);
    return NextResponse.json(
      { error: 'Failed to generate answer' },
      { status: 500 }
    );
  }
}

function formatProfile(profile: {
  basics: {
    firstName: string;
    lastName: string;
    email: string;
    location: string;
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
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
}): string {
  const lines: string[] = [];

  // Basics
  lines.push(`Name: ${profile.basics.firstName} ${profile.basics.lastName}`);
  if (profile.basics.location) {
    lines.push(`Location: ${profile.basics.location}`);
  }

  // Education
  if (profile.education.length > 0) {
    lines.push('\n### Education');
    for (const edu of profile.education) {
      lines.push(`- ${edu.degree} in ${edu.field} from ${edu.institution} (${edu.startDate} - ${edu.endDate})${edu.gpa ? `, GPA: ${edu.gpa}` : ''}`);
    }
  }

  // Experience
  if (profile.experience.length > 0) {
    lines.push('\n### Experience');
    for (const exp of profile.experience) {
      lines.push(`\n**${exp.title}** at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})`);
      for (const bullet of exp.bullets) {
        if (bullet.trim()) {
          lines.push(`- ${bullet}`);
        }
      }
    }
  }

  // Projects
  if (profile.projects.length > 0) {
    lines.push('\n### Projects');
    for (const proj of profile.projects) {
      lines.push(`\n**${proj.name}**${proj.technologies.length > 0 ? ` (${proj.technologies.join(', ')})` : ''}`);
      if (proj.description) {
        lines.push(proj.description);
      }
      for (const bullet of proj.bullets) {
        if (bullet.trim()) {
          lines.push(`- ${bullet}`);
        }
      }
    }
  }

  // Skills
  if (profile.skills.length > 0) {
    lines.push('\n### Skills');
    for (const skill of profile.skills) {
      if (skill.category && skill.items.length > 0) {
        lines.push(`- ${skill.category}: ${skill.items.join(', ')}`);
      }
    }
  }

  return lines.join('\n');
}
