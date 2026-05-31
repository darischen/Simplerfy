# Simplerfy

A comprehensive job application management and resume tailoring platform powered by AI. Simplerfy helps job seekers optimize their resumes, track applications, and generate compelling answers for job applications.

## Features

### Dashboard
- **Application Overview** - View statistics on your job applications across different stages (applied, interviewing, offers)
- **Recent Applications** - Track your most recent applications at a glance
- **Quick Actions** - Easy access to tailoring, tracking, and answer generation features
- **Profile Setup** - Reminder to complete your profile for enhanced functionality

### Resume Tailor
The core feature of Simplerfy that helps optimize resumes for specific job postings:

- **PDF to LaTeX Conversion** - Upload your resume PDF, which is automatically converted to clean, compilable LaTeX code using Claude AI
- **Job-Specific Tailoring** - Paste a job description and let Claude tailor your resume to match the role requirements
- **Match Score Comparison** - See before/after scores showing how well your resume matches the job description
- **Detailed Feedback** - Get strengths, gaps, and specific suggestions for improvement
- **PDF Preview** - Side-by-side comparison of original and tailored resumes
- **Export Options** - Download tailored PDF or copy LaTeX code for further customization

### Profile Management
Store your professional information for quick access and application autofill:
- Personal details (name, email, phone, address)
- Education history
- Work experience
- Application preferences (salary expectations, relocation, sponsorship, etc.)
- Demographic information (optional)

### Application Tracker
Keep organized records of your job applications:
- Track application status (applied, screening, interviewing, offer, rejected)
- Store company and position information
- Record application dates and details
- View application history and statistics

### Answer Generator
*(Feature in development)*
Generate AI-powered answers for job application questions tailored to specific roles and companies.

## Tech Stack

- **Frontend**: React 19.2.3 with TypeScript
- **Framework**: Next.js 16.1.5 with App Router
- **Styling**: TailwindCSS 4
- **AI**: Anthropic Claude API (via `@anthropic-ai/sdk`)
- **PDF Processing**: 
  - `react-pdf` - View PDFs in browser
  - `@react-pdf/renderer` - Generate PDFs
  - `pdf-parse` - Extract text from PDFs
- **Storage**: Browser localStorage (client-side)
- **LaTeX Compilation**: External API (latex.ytotech.com)

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- `ANTHROPIC_API_KEY` environment variable set with your Claude API key

### Installation

```bash
# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

### Development

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app will auto-reload as you make changes.

### Production Build

```bash
npm run build
npm start
```

## API Routes

### `POST /api/pdf-to-latex`
Converts a PDF resume to LaTeX code using Claude's vision capabilities.

**Request:**
- `resume` (File): PDF file to convert

**Response:**
```json
{
  "latex": "\\documentclass[...]{article}..."
}
```

### `POST /api/compile-latex`
Compiles LaTeX code to PDF using an external LaTeX compiler.

**Request:**
```json
{
  "latex": "\\documentclass[...]{article}..."
}
```

**Response:**
```json
{
  "pdf": "base64-encoded-pdf-data"
}
```

### `POST /api/score`
Scores a resume against a job description using Claude.

**Request:**
```json
{
  "resume": "resume text or LaTeX",
  "jobDescription": "job posting text"
}
```

**Response:**
```json
{
  "score": 85,
  "summary": "Strong match with relevant experience",
  "strengths": ["Experience in required tech stack", ...],
  "gaps": ["Missing MBA", ...],
  "suggestions": ["Add metrics to projects", ...]
}
```

### `POST /api/tailor-latex`
Tailors a resume LaTeX for a specific job description using Claude.

**Request:**
```json
{
  "latex": "\\documentclass[...]{article}...",
  "jobDescription": "job posting text"
}
```

**Response:**
```json
{
  "tailoredLatex": "\\documentclass[...]{article}..."
}
```

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (pdf-to-latex, compile-latex, score, tailor-latex)
│   ├── page.tsx          # Dashboard
│   ├── layout.tsx        # Root layout
│   ├── profile/          # Profile management
│   ├── tailor/           # Resume tailor feature
│   ├── tracker/          # Application tracking
│   └── answers/          # Answer generator
├── components/
│   └── Navigation.tsx    # Navigation component
├── lib/
│   └── storage.ts        # localStorage utilities for profiles and applications
└── styles/               # Global styles

extension/               # Browser extension files (if applicable)
```

## Data Storage

All user data is stored in browser localStorage:
- **User Profile**: Personal and professional information
- **Job Applications**: Application records and status
- **Resume Files**: Stored PDFs in base64 format

*Note: Data is persistent within the browser but not synced across devices. Consider implementing a backend database for production use.*

## Configuration

### Environment Variables

Create a `.env.local` file:

```env
ANTHROPIC_API_KEY=your-api-key-here
```

## Future Enhancements

- Backend database integration for cross-device sync
- Email notifications for application updates
- Integration with job boards (LinkedIn, Indeed, etc.)
- Enhanced answer generator with company-specific customization
- Resume templates and customization options
- Analytics dashboard with application success metrics
- Interview preparation guides
- Salary negotiation tools

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or feedback, please open an issue on the GitHub repository.

---

**Note**: This tool uses Claude AI for resume analysis and tailoring. Ensure you have a valid Anthropic API key and understand the associated costs before deploying to production.
