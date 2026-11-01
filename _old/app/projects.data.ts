export type Project = {
  id: string;
  title: string;
  tagline: string;
  summary: string;
  role: string;
  timeline: string;
  genre: string;
  status: string;
  stack: string[];
  features: string[];
  highlights: string[];
};

export const PROJECTS: Project[] = [
  {
    id: 'meganopoly-xr',
    title: 'Meganopoly XR',
    tagline: 'Room-scale multiplayer with holographic UI and social voice.',
    summary:
      'A Monopoly-inspired XR multiplayer experience built for fast onboarding, spatial presence, and repeatable party sessions.',
    role: 'Room-scale multiplayer',
    timeline: '2026',
    genre: 'XR board game',
    status: 'Completed',
    stack: ['Unity', 'C#', 'XR', 'Networking', 'Vivox', 'Blender'],
    features: [
      'Real-time multiplayer for up to 4 players',
      'Gesture-based interaction and holographic HUD',
      'Mini-game rotation to keep sessions fresh',
      'Spatial voice chat and synchronized board state',
    ],
    highlights: [
      'Optimized networking loop for low-latency XR',
      'Custom UI kit for diegetic panels and prompts',
      '3D asset pipeline and Blender integration',
    ],
  },
  {
    id: 'magic-arena-xr',
    title: 'Magic Arena XR',
    tagline: 'Spellcasting combat with AI-assisted voice control.',
    summary:
      'Wave-based VR combat with puzzle-driven progression and responsive spellcrafting tuned for immersion.',
    role: 'Spellcasting VR',
    timeline: '2025-2026',
    genre: 'XR action',
    status: 'Published',
    stack: ['Unity', 'XR', 'AI', 'Gameplay Systems'],
    features: [
      'Elemental abilities with unique combos',
      'Voice-assisted spell activation and cooldowns',
      'Puzzle gates tied to combat progression',
      'Adaptive enemy AI behaviors',
    ],
    highlights: [
      'Voice command flow for hands-free casting',
      'AI pacing tuned for short intense sessions',
      'Cohesive combat and puzzle loop',
    ],
  },
  {
    id: 'bad-ice-cream-3d',
    title: 'Bad Ice Cream 3D',
    tagline: 'Arcade multiplayer with lively AI and voice chat.',
    summary:
      'A 3D arcade multiplayer experience with matchmaking, co-op objectives, and chaotic enemy encounters.',
    role: 'Arcade multiplayer',
    timeline: '2025',
    genre: 'Arcade co-op',
    status: 'Completed',
    stack: ['Unity', 'UGS', 'Vivox', 'Multiplayer Sync'],
    features: [
      'Authentication and matchmaking via UGS',
      'AI-driven enemy behavior and pathing',
      'Real-time voice communication',
      'Session-based scoring and progression',
    ],
    highlights: [
      'Multiplayer sync tuned for arcade pacing',
      'Enemy behaviors designed for chaos loops',
      'UGS pipeline for quick session start',
    ],
  },
];
