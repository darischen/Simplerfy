export interface ResumeData {
  basics: {
    name: string;
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
    graduationDate: string;
    gpa?: string;
    relevantCourses?: string[];
  }[];
  experience: {
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
    tags: string[]; // e.g., ["python", "ml", "aws"] for matching
  }[];
  projects: {
    name: string;
    description: string;
    bullets: string[];
    technologies: string[];
    link?: string;
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
}