export type Course = {
  id: string;
  slug: string;
  title: string;
  category: string;
  duration: string;
  delivery: string;
  level: string;
  schedule: string;
  fee: string;
  summary: string;
  description: string;
  modules: string[];
  outcomes: string[];
  requirements: string[];
  accent: "blue" | "red" | "violet" | "cyan";
  featured?: boolean;
};

export const courses: Course[] = [
  {
    id: "BLAC-WEB-001",
    slug: "full-stack-web-development",
    title: "Full-Stack Web Development",
    category: "Software Development",
    duration: "12 weeks",
    delivery: "Online & practical",
    level: "Beginner friendly",
    schedule: "3 sessions per week",
    fee: "Contact admissions",
    summary:
      "Build responsive websites, connect APIs and publish complete web applications.",
    description:
      "A project-led programme that takes you from the structure of a web page to a complete, deployed application. Every learner finishes with portfolio-ready work.",
    modules: [
      "HTML structure and accessibility",
      "Modern CSS and responsive layouts",
      "JavaScript fundamentals and the DOM",
      "Working with APIs and JSON",
      "Git, GitHub and deployment",
      "Final portfolio project",
    ],
    outcomes: [
      "Create mobile-first websites",
      "Build interactive interfaces",
      "Connect a frontend to an API",
      "Publish and maintain projects with GitHub",
    ],
    requirements: [
      "A laptop with internet access",
      "Basic computer knowledge",
      "Commitment to weekly practical work",
    ],
    accent: "blue",
    featured: true,
  },
  {
    id: "BLAC-AI-002",
    slug: "ai-automation",
    title: "AI & Intelligent Automation",
    category: "Artificial Intelligence",
    duration: "10 weeks",
    delivery: "Online & practical",
    level: "Beginner to intermediate",
    schedule: "2 sessions per week",
    fee: "Contact admissions",
    summary:
      "Use AI responsibly, design reliable prompts and automate practical workflows.",
    description:
      "Learn how modern AI tools work, how to communicate with them clearly and how to design useful automations for study, content and business operations.",
    modules: [
      "AI foundations and responsible use",
      "Professional prompt engineering",
      "Research and information workflows",
      "Content and visual creation",
      "Google Workspace automation",
      "Practical automation project",
    ],
    outcomes: [
      "Design reusable prompt systems",
      "Automate repeatable tasks",
      "Evaluate AI output for quality",
      "Build an applied AI portfolio project",
    ],
    requirements: [
      "A smartphone or laptop",
      "Reliable internet access",
      "No previous AI experience required",
    ],
    accent: "violet",
    featured: true,
  },
  {
    id: "BLAC-CYB-003",
    slug: "cybersecurity-foundations",
    title: "Cybersecurity Foundations",
    category: "Cybersecurity",
    duration: "12 weeks",
    delivery: "Online lab sessions",
    level: "Foundation",
    schedule: "3 sessions per week",
    fee: "Contact admissions",
    summary:
      "Understand digital threats, secure devices and practise defensive security safely.",
    description:
      "A responsible introduction to cybersecurity focused on protection, safe testing, risk awareness and practical defensive skills.",
    modules: [
      "Security principles and digital safety",
      "Linux and command-line foundations",
      "Networking for security",
      "Threats, vulnerabilities and controls",
      "Web security fundamentals",
      "Defensive security lab project",
    ],
    outcomes: [
      "Recognise common cyber risks",
      "Secure personal and organisational devices",
      "Use Linux security tools responsibly",
      "Document a basic security assessment",
    ],
    requirements: [
      "A laptop that can run Linux tools",
      "Basic computer knowledge",
      "Agreement to the responsible-use policy",
    ],
    accent: "red",
    featured: true,
  },
  {
    id: "BLAC-MOB-004",
    slug: "mobile-app-development",
    title: "Mobile App Development",
    category: "Software Development",
    duration: "14 weeks",
    delivery: "Online & practical",
    level: "Beginner to intermediate",
    schedule: "3 sessions per week",
    fee: "Contact admissions",
    summary:
      "Design and build modern Android applications with Flutter and Dart.",
    description:
      "Turn an app idea into a responsive Android product while learning interface design, local data, APIs and release preparation.",
    modules: [
      "Dart programming foundations",
      "Flutter layouts and navigation",
      "Forms, state and validation",
      "Local storage and APIs",
      "Authentication and app security",
      "Final Android application",
    ],
    outcomes: [
      "Build responsive Flutter interfaces",
      "Store and retrieve application data",
      "Connect mobile apps to web APIs",
      "Prepare an Android release build",
    ],
    requirements: [
      "A development laptop",
      "Android phone for testing",
      "Basic programming is helpful but not required",
    ],
    accent: "cyan",
  },
  {
    id: "BLAC-NET-005",
    slug: "computer-networks-configuration",
    title: "Computer Networks & Configuration",
    category: "Infrastructure",
    duration: "8 weeks",
    delivery: "Hybrid practical",
    level: "Foundation",
    schedule: "2 sessions per week",
    fee: "Contact admissions",
    summary:
      "Configure small networks, diagnose connectivity and document infrastructure.",
    description:
      "Develop practical networking skills through addressing, cabling, device configuration, troubleshooting and secure network planning.",
    modules: [
      "Networking models and devices",
      "IPv4 addressing and subnetting",
      "Cabling and wireless foundations",
      "Router and switch configuration",
      "Troubleshooting and documentation",
      "Small-office network project",
    ],
    outcomes: [
      "Plan a small computer network",
      "Configure basic network devices",
      "Diagnose common connection problems",
      "Produce a professional network report",
    ],
    requirements: [
      "Basic computer knowledge",
      "A laptop for simulations",
      "Availability for practical sessions",
    ],
    accent: "blue",
  },
  {
    id: "BLAC-DIG-006",
    slug: "digital-business-skills",
    title: "Digital Skills for Business",
    category: "Business Technology",
    duration: "6 weeks",
    delivery: "Online",
    level: "Beginner friendly",
    schedule: "2 sessions per week",
    fee: "Contact admissions",
    summary:
      "Organise work, communicate professionally and use digital tools confidently.",
    description:
      "A practical programme for students, professionals and business owners who want stronger productivity, communication and digital organisation skills.",
    modules: [
      "Digital organisation and file management",
      "Professional email and communication",
      "Documents, spreadsheets and presentations",
      "Online collaboration and cloud storage",
      "Digital branding foundations",
      "Personal productivity system",
    ],
    outcomes: [
      "Work confidently with productivity tools",
      "Create clear professional documents",
      "Organise files and cloud resources",
      "Build a reliable digital workflow",
    ],
    requirements: [
      "A smartphone or laptop",
      "Basic ability to use a browser",
      "No technical background required",
    ],
    accent: "red",
  },
];

export const categories = [
  "All courses",
  ...Array.from(new Set(courses.map((course) => course.category))),
];
