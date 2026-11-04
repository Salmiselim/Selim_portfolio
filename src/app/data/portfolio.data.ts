/**
 * Single source of truth for every piece of content on the site.
 * Edit this file to update the portfolio — no template changes needed.
 * Source: Selim_Salmi_Resume.pdf (new résumé).
 */

export const SITE = {
  name: 'Selim Salmi',
  url: 'https://selim-salmi.tn',
  title: 'Selim Salmi | Full Stack & Game Developer',
  description:
    'Selim Salmi is a final-year software engineering student at ESPRIT (Tunisia) building XR/VR multiplayer games in Unity and full-stack web platforms with Spring Boot, Symfony and Angular. Seeking a 6-month PFE internship starting January 2027.',
} as const;

export const PROFILE = {
  name: 'Selim Salmi',
  role: 'Full Stack Developer | Game Developer',
  location: 'Tunisia',
  email: 'salmiselim2016@gmail.com',
  github: { label: 'github.com/Salmiselim', href: 'https://github.com/Salmiselim' },
  linkedin: { label: 'linkedin.com/in/selim-salmi', href: 'https://linkedin.com/in/selim-salmi' },
  tagline: 'I build multiplayer XR games and the real-time web systems around them.',
  summary:
    'Final-year software engineering student at ESPRIT (Bac+5 engineering diploma) with full-stack experience in Java, Spring Boot, Symfony and Angular, plus real-time and Unity development.',
  seeking: {
    short: '6-month PFE internship · January 2027',
    long: 'a 6-month end-of-studies internship (PFE) starting January 2027',
  },
  itch: { label: 'selim-salmi.itch.io', href: 'https://selim-salmi.itch.io/' },
  resumeUrl: '/resume.pdf',
} as const;

/* ------------------------------------------------------------------------------------------------
 * MEDIA: screenshots and demo videos
 * ------------------------------------------------------------------------------------------------
 * 1. Put your files in  public/media/<project-id>/   (e.g. public/media/meganopoly-xr/lobby.jpg)
 * 2. List them in the project's `media` array below, in the order you want them shown.
 *    The first video (or the first item if there is no video) becomes the big featured player.
 *
 *    { kind: 'image',   src: '/media/meganopoly-xr/lobby.jpg', alt: 'Players in the lobby' }
 *    { kind: 'video',   src: '/media/meganopoly-xr/demo.mp4', poster: '/media/meganopoly-xr/poster.jpg' }
 *    { kind: 'youtube', id: 'dQw4w9WgXcQ' }            // the id from youtube.com/watch?v=<id>
 *
 * Tips: export screenshots as .jpg or .webp at ~1920px wide, keep videos under ~25 MB (H.264 .mp4),
 * or upload long videos to YouTube. Projects without media show their vector cover art instead.
 * ---------------------------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------------------------------
 * ANALYTICS: your private visitor statistics (Umami Cloud, free, cookie-free)
 * 1. Create a free account at https://cloud.umami.is and add your website.
 * 2. Copy its "Website ID" (a long id like 94db1cb1-74f4-...) and paste it below.
 * 3. Deploy. Your stats dashboard is https://cloud.umami.is, only reachable with your login.
 * Leave the id empty to turn analytics off completely (nothing is loaded).
 * ---------------------------------------------------------------------------------------------- */
export const ANALYTICS = {
  umamiWebsiteId: 'db7d3b52-3086-4db0-b65f-5f6f29c2340f',
  scriptUrl: 'https://cloud.umami.is/script.js',
  /** Optional: only count visits on these exact hostnames (e.g. ['selim-salmi.tn']). Empty = any host except localhost. */
  domains: [] as string[],
} as const;

export type Media =
  | {
      readonly kind: 'image'; readonly src: string; readonly alt: string; readonly caption?: string;
      /** 'contain' shows the whole picture (good for UI screenshots and posters); default 'cover' fills the frame. */
      readonly fit?: 'cover' | 'contain';
    }
  | { readonly kind: 'video'; readonly src: string; readonly poster?: string; readonly caption?: string }
  | { readonly kind: 'youtube'; readonly id: string; readonly caption?: string };

/** Optional showreel for the top of the home page (any Media item). Leave null to show project covers. */
export const SHOWREEL: Media | null = null;

export interface Experience {
  readonly company: string;
  readonly role: string;
  readonly period: string;
  readonly points: readonly string[];
  readonly tags: readonly string[];
  /** Optional id of a project in PROJECTS built during this role (adds a link to its case study). */
  readonly project?: string;
}

export const EXPERIENCE: readonly Experience[] = [
  {
    company: 'Lanterns Studio',
    role: 'Game Programmer Intern',
    period: '06/2026 – 08/2026',
    points: [
      'Developed “The Long Way Out”, a 3D platformer built in Unity 6 and Blender.',
      'Players guide a bug through hazards, unlock new abilities and meet other bugs while escaping into the outside world.',
    ],
    tags: ['Unity 6', 'C#', 'Blender'],
    project: 'the-long-way-out',
  },
  {
    company: 'Tunisie Sécurité',
    role: 'Software Developer Intern',
    period: '01/2024 – 05/2024',
    points: [
      'Built a full-stack platform (Angular, Spring Boot) for a cash-in-transit company to manage fleet and agency data and optimize multi-stop transport routes with the Leaflet API, including distance and travel-time estimates.',
      'Implemented real-time data synchronization using WebSockets.',
    ],
    tags: ['Angular', 'Spring Boot', 'Leaflet', 'WebSockets'],
    project: 'tunisie-securite',
  },
  {
    company: 'Easyward',
    role: 'Web Developer Intern',
    period: '01/2023 – 02/2023',
    points: [
      'Developed a web application using Angular and PHP.',
      'Worked with WordPress and client management systems.',
    ],
    tags: ['Angular', 'PHP', 'WordPress'],
  },
];

export interface SkillGroup {
  readonly title: string;
  readonly icon: 'code' | 'layers' | 'database' | 'gamepad';
  readonly items: readonly string[];
}

export const SKILLS: readonly SkillGroup[] = [
  { title: 'Languages', icon: 'code', items: ['Java', 'Python', 'JavaScript', 'PHP', 'C#'] },
  { title: 'Frameworks', icon: 'layers', items: ['Spring Boot', 'Symfony', 'Angular', 'React'] },
  {
    title: 'Data & networking',
    icon: 'database',
    items: ['MySQL', 'WebSockets', 'HAProxy (basics)', 'VMware (basics)'],
  },
  {
    title: 'Game development',
    icon: 'gamepad',
    items: ['Unity (C#)', 'XR/VR development', 'Blender'],
  },
];

export interface Education {
  readonly title: string;
  readonly school: string;
  readonly detail?: string;
  readonly period: string;
}

export const EDUCATION: readonly Education[] = [
  {
    title: 'Software Engineering',
    school: 'ESPRIT, Higher School of Engineering and Technologies',
    detail: 'Bac+5, Master’s level',
    period: '09/2024 – Present',
  },
  {
    title: 'Bachelor’s Degree in Computer Science',
    school: 'ISET Rades',
    period: '09/2021 – 07/2024',
  },
  {
    title: 'High School Diploma: Economics and Management',
    school: 'Lycée Ali Douagi la Marsa Saada',
    period: '09/2017 – 07/2021',
  },
];

export const CERTIFICATES = [
  { title: 'ReactJS Training', issuer: 'GoMyCode', detail: 'Manipulating ReactJS and its methods' },
  {
    title: 'Web Development Training',
    issuer: 'GoMyCode',
    detail: 'Fundamentals of modern web development (HTML, CSS, JavaScript)',
  },
] as const;

export const LANGUAGES = [
  { name: 'Arabic', level: 'Native' },
  { name: 'French', level: 'Fluent' },
  { name: 'English', level: 'Professional' },
] as const;

export const LEADERSHIP = [
  {
    title: 'President, Leo Club Tunis Ares',
    period: '2025 – 2026',
    detail: 'Previously vice president and HR manager of the same club.',
    icon: 'users',
  },
  {
    title: 'Custom 3D prints',
    period: 'Side business',
    detail: 'I run a small side business selling custom 3D-printed items.',
    icon: 'cube',
  },
] as const;

export type ProjectArt = 'board' | 'arena' | 'pulse' | 'ice' | 'bug' | 'route';

export interface Project {
  readonly id: string;
  readonly title: string;
  /** 'game' projects are listed first on the home page, then 'web'. */
  readonly category: 'game' | 'web';
  readonly kicker: string;
  readonly tagline: string;
  readonly summary: string;
  readonly platform: string;
  readonly year?: string;
  readonly status: string;
  readonly stack: readonly string[];
  readonly features: readonly string[];
  readonly highlights?: readonly string[];
  /** Vector cover used when a project has no screenshots or video. */
  readonly art: ProjectArt;
  /** Accent colour for the card + case-study page (CSS colour). */
  readonly color: string;
  /** Optional landscape image for the home-page card (defaults to the trailer poster or first screenshot). */
  readonly cover?: string;
  /** Portrait key art (poster). Games with one appear in the itch.io section. */
  readonly poster?: string;
  /** Screenshots and demo videos, see the MEDIA notes at the top of this file. */
  readonly media: readonly Media[];
}

/** Games first, then web platforms. Order here = order on the site. */
export const PROJECTS: readonly Project[] = [
  {
    id: 'meganopoly-xr',
    title: 'Meganopoly',
    category: 'game',
    kicker: 'XR multiplayer game · Meta Quest',
    tagline: 'A life-sized XR reinterpretation of Monopoly you physically walk through.',
    summary:
      'An immersive XR/VR reinterpretation of Monopoly where players physically navigate a life-sized, interactive game board. I designed and developed the core gameplay systems, eight original mini-games and the multiplayer trading layer.',
    platform: 'Meta Quest (XR/VR)',
    year: '2026',
    status: 'Completed',
    stack: ['Unity', 'C#', 'XR/VR', 'Multiplayer', 'Blender'],
    features: [
      'Core gameplay systems: turn logic, property and rent management, dice mechanics.',
      '8 original, culturally themed mini-games with scalable difficulty.',
      'Gesture-based interactions designed for a room-scale board.',
      'Spatial multiplayer trading between players.',
      'Real-time multiplayer for up to 4 players with spatial voice chat.',
    ],
    highlights: [
      'Custom UI kit for diegetic panels and prompts.',
      '3D asset pipeline and Blender integration.',
    ],
    art: 'board',
    color: '#fbbf24',
    cover: '/media/meganopoly-xr/board.jpg',
    poster: '/media/meganopoly-xr/poster-art.jpg',
    media: [
      { kind: 'video', src: '/media/meganopoly-xr/trailer.mp4', poster: '/media/meganopoly-xr/trailer-poster.jpg', caption: 'Official trailer' },
      { kind: 'image', src: '/media/meganopoly-xr/board.jpg', alt: 'The life-sized Monopoly board surrounded by a low-poly city', caption: 'The life-sized board' },
      { kind: 'image', src: '/media/meganopoly-xr/arcade-hub.jpg', alt: 'Neon arcade room with Meganopoly arcade cabinets', caption: 'Arcade hub' },
      { kind: 'image', src: '/media/meganopoly-xr/allouch-l3id.jpg', alt: 'Mini-game arena where players search for their sheep among parked cars', caption: 'Mini-game: Allouch l’3id, find your sheep' },
      { kind: 'image', src: '/media/meganopoly-xr/khobz.jpg', alt: 'Farm at sunset with bread ovens, cows and a windmill', caption: 'Mini-game: Khobz, bake the bread rolls' },
      { kind: 'image', src: '/media/meganopoly-xr/bent-walad.jpg', alt: 'Classroom with desks and a whiteboard showing the letter and winner', caption: 'Mini-game: Bent Walad, the classroom word game' },
    ],
  },
  {
    id: 'the-long-way-out',
    title: 'The Long Way Out',
    category: 'game',
    kicker: '3D platformer · Lanterns Studio internship',
    tagline: 'Guide a tiny bug across a giant house to escape into the outside world.',
    summary:
      'A 3D platformer I developed during my game programmer internship at Lanterns Studio, built in Unity 6 with Blender. Players guide a bug through household hazards, unlock new abilities and meet other bugs on the way out into the outside world.',
    platform: 'Unity 6 (demo)',
    year: '2026',
    status: 'Playable demo on itch.io',
    stack: ['Unity 6', 'C#', 'Blender'],
    features: [
      'Level-based progression through the house: Floor (Cat’s Claws), Counter (Water Maze) and Cabinet (Brave the Wind).',
      'New abilities unlocked along the way, such as climbing special walls.',
      'Side quests from other bugs, like returning a lost fly to the spider.',
      'Comic-style illustrated story scenes between levels.',
      'Health hearts, distance tracker and a three-slot save system.',
    ],
    art: 'bug',
    color: '#a3e635',
    poster: '/media/the-long-way-out/poster-art.jpg',
    media: [
      { kind: 'video', src: '/media/the-long-way-out/promo.mp4', poster: '/media/the-long-way-out/poster.jpg', caption: 'Promo video' },
      { kind: 'image', src: '/media/the-long-way-out/floor-level.jpg', alt: 'The bug crossing the kitchen floor in the Cat’s Claws level', caption: 'Floor level: Cat’s Claws' },
      { kind: 'image', src: '/media/the-long-way-out/counter-level.jpg', alt: 'The bug on the kitchen counter in the Water Maze level', caption: 'Counter level: Water Maze' },
      { kind: 'image', src: '/media/the-long-way-out/cabinet-level.jpg', alt: 'The bug on top of the cabinet in the Brave the Wind level', caption: 'Cabinet level: Brave the Wind' },
      { kind: 'image', src: '/media/the-long-way-out/climbing-hint.jpg', alt: 'In-game hint telling the player some walls can be climbed', caption: 'Unlocking wall climbing' },
      { kind: 'image', src: '/media/the-long-way-out/story.jpg', alt: 'Illustrated story scene with cries for help behind a door', caption: 'Comic-style story scenes' },
      { kind: 'image', src: '/media/the-long-way-out/title.jpg', alt: 'Save slot selection screen with the game logo', caption: 'Save slot selection' },
      { kind: 'image', src: '/media/the-long-way-out/poster-art.jpg', alt: 'The Long Way Out poster: a green beetle on a kitchen plant', caption: 'Key art', fit: 'contain' },
    ],
  },
  {
    id: 'magic-arena-xr',
    title: 'Magic Arena',
    category: 'game',
    kicker: 'VR combat game · Meta Quest',
    tagline: 'Cast elemental spells with your voice across three waves of combat.',
    summary:
      'A completed VR combat game for Meta Quest built with Unity 6 and C#. Players cast elemental spells by voice, fight enemies with adaptive AI and solve puzzles that gate progression across three levels of wave-based combat.',
    platform: 'Meta Quest (VR)',
    year: '2025 – 2026',
    status: 'Completed',
    stack: ['Unity 6', 'C#', 'XR/VR', 'AI'],
    features: [
      'Voice-activated elemental spellcasting.',
      'Adaptive enemy AI that reacts to the player.',
      'Puzzle-gated level progression.',
      '3 levels of wave-based combat.',
    ],
    highlights: [
      'Hands-free voice command flow for casting and cooldowns.',
      'Pacing tuned for short, intense sessions.',
    ],
    art: 'arena',
    color: '#f87171',
    cover: '/media/magic-arena-xr/cover.jpg',
    poster: '/media/magic-arena-xr/poster-art.jpg',
    media: [
      { kind: 'video', src: '/media/magic-arena-xr/trailer.mp4', poster: '/media/magic-arena-xr/poster.jpg', caption: 'Official trailer' },
      { kind: 'image', src: '/media/magic-arena-xr/great-hall-waves.jpg', alt: 'Monsters attacking in the great hall while the player aims a wand', caption: 'Wave combat in the great hall' },
      { kind: 'image', src: '/media/magic-arena-xr/skeleton-lightning.jpg', alt: 'Lightning spell striking a skeleton in the cathedral', caption: 'Casting lightning at a skeleton' },
      { kind: 'image', src: '/media/magic-arena-xr/cathedral-combat.jpg', alt: 'Player wand firing a spell at an enemy in the cathedral', caption: 'Spell combat in the cathedral' },
      { kind: 'image', src: '/media/magic-arena-xr/treasure-chest.jpg', alt: 'Opening a green treasure chest with the wand', caption: 'Searching treasure chests' },
      { kind: 'image', src: '/media/magic-arena-xr/golden-key.jpg', alt: 'A key inside a glowing golden chest', caption: 'Finding the key' },
      { kind: 'image', src: '/media/magic-arena-xr/puzzle-clue.jpg', alt: 'A note with the numbers 1 2 3 on a table, a puzzle clue', caption: 'Puzzle clues gate progression', fit: 'contain' },
      { kind: 'image', src: '/media/magic-arena-xr/dungeon-tunnels.jpg', alt: 'Brick dungeon tunnels with arches', caption: 'Dungeon tunnels' },
      { kind: 'image', src: '/media/magic-arena-xr/level-3.jpg', alt: 'Level 3, wave 1 of 3, score 450, with a music-note puzzle', caption: 'Level 3, wave 1 of 3', fit: 'contain' },
      { kind: 'image', src: '/media/magic-arena-xr/poster-art.jpg', alt: 'Magic Arena poster: a young mage holding a staff and a spell book', caption: 'Key art', fit: 'contain' },
    ],
  },
  {
    id: 'bad-ice-cream-3d',
    title: 'Bad Ice Cream 3D',
    category: 'game',
    kicker: '3D multiplayer arcade · Unity',
    tagline: 'A competitive 3D take on the classic arcade game, with matchmaking.',
    summary:
      'A 3D multiplayer arcade game inspired by the classic Bad Ice Cream, featuring AI-driven fruit behaviors and competitive enemy mechanics. Player authentication and matchmaking run on Unity Gaming Services.',
    platform: 'Unity (PC)',
    year: '2025',
    status: 'Completed',
    stack: ['Unity', 'C#', 'Unity Gaming Services', 'Multiplayer'],
    features: [
      'AI-driven fruit behaviors and pathing.',
      'Competitive enemy mechanics.',
      'Player authentication and matchmaking through Unity Gaming Services.',
    ],
    highlights: ['Multiplayer sync tuned for arcade pacing.'],
    art: 'ice',
    color: '#f472b6',
    media: [],
  },
  {
    id: 'tunisie-securite',
    title: 'Tunisie Sécurité',
    category: 'web',
    kicker: 'Cash-in-transit logistics platform · Internship',
    tagline: 'Fleet, agency and fund-transfer management with optimized multi-stop routes.',
    summary:
      'A full-stack platform I built with Angular and Spring Boot during my software developer internship at Tunisie Sécurité, a cash-in-transit company. It manages banks, agencies, clients and fund-transfer orders, plans deliveries and optimizes multi-stop transport routes on a map with the Leaflet API, including distance and travel-time estimates.',
    platform: 'Web (Angular + Spring Boot)',
    year: '2024',
    status: 'Internship project',
    stack: ['Angular', 'Spring Boot', 'Leaflet', 'WebSockets'],
    features: [
      'Multi-stop route optimization on a Leaflet map, with total distance, travel time and the order of stops.',
      'Delivery planning from validated fund requests and fund pick-ups.',
      'Fund-request orders tracked by status: in progress, cancelled and validated.',
      'Management of banks, agencies (grouped by zone) and clients.',
      'Invoices broken down by banknote and coin denominations.',
      'Real-time data synchronization using WebSockets, behind an authenticated login.',
    ],
    art: 'route',
    color: '#60a5fa',
    cover: '/media/tunisie-securite/cover.jpg',
    media: [
      { kind: 'image', src: '/media/tunisie-securite/route-optimization.jpg', alt: 'Map with an optimized red route between agencies, total distance and travel time', caption: 'Optimized multi-stop route with distance and travel time', fit: 'contain' },
      { kind: 'image', src: '/media/tunisie-securite/delivery-planning.jpg', alt: 'Delivery planning page with validated fund requests and a map', caption: 'Delivery planning', fit: 'contain' },
      { kind: 'image', src: '/media/tunisie-securite/fund-requests.jpg', alt: 'Fund-request orders grouped as in progress, cancelled and validated', caption: 'Fund-request orders by status', fit: 'contain' },
      { kind: 'image', src: '/media/tunisie-securite/agencies.jpg', alt: 'Agency list with edit and delete actions, and agencies grouped by zone', caption: 'Agencies by zone', fit: 'contain' },
      { kind: 'image', src: '/media/tunisie-securite/invoice.jpg', alt: 'Invoice with amounts per banknote and coin denomination', caption: 'Invoice by denomination', fit: 'contain' },
      { kind: 'image', src: '/media/tunisie-securite/login.jpg', alt: 'Login page with the Tunisie Sécurité logo', caption: 'Authentication', fit: 'contain' },
    ],
  },
  {
    id: 'suivital',
    title: 'Suivital',
    category: 'web',
    kicker: 'Health platform · Symfony & Java',
    tagline: 'Describe symptoms, get AI-suggested medications, book a doctor.',
    summary:
      'Suivital is a medical platform built as a Symfony web application with a MySQL database, plus a Java desktop version of the same product. Patients describe symptoms, an AI assistant suggests suitable medications, and they can then book an appointment with a doctor.',
    platform: 'Web (Symfony) + Java desktop',
    status: 'Completed',
    stack: ['Symfony', 'PHP', 'MySQL', 'Java'],
    features: [
      'AI assistant that suggests suitable medications from described symptoms.',
      'Appointment booking: patients request, doctors receive and schedule.',
      'Calendar management for doctors.',
      'A Java desktop version of the same application.',
      'Deployed on a local network across 3 computers: one each for frontend, backend and database.',
    ],
    art: 'pulse',
    color: '#34d399',
    media: [
      { kind: 'image', src: '/media/suivital/landing.jpg', alt: 'Suivital landing page', caption: 'Landing page', fit: 'contain' },
      { kind: 'image', src: '/media/suivital/booking.jpg', alt: 'Appointment booking form with doctor, date and time', caption: 'Booking an appointment', fit: 'contain' },
      { kind: 'image', src: '/media/suivital/dashboard.jpg', alt: 'Patient dashboard listing upcoming appointments', caption: 'Patient dashboard', fit: 'contain' },
    ],
  },
];

export const NAV = [
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
] as const;

/** Scrolling ticker under the hero. */
export const TICKER = [
  'Unity', 'C#', 'XR / VR', 'Meta Quest', 'Multiplayer', 'Spring Boot', 'Angular', 'Symfony',
  'WebSockets', 'Blender', 'Java', 'MySQL',
] as const;
