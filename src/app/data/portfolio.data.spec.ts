import { EXPERIENCE, NAV, PROJECTS } from './portfolio.data';

describe('portfolio data', () => {
  it('has unique project ids that are safe to use in URLs', () => {
    const ids = PROJECTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[a-z0-9-]+$/));
  });

  it('gives every project a summary, features and a stack', () => {
    PROJECTS.forEach((p) => {
      expect(p.summary.length).toBeGreaterThan(40);
      expect(p.features.length).toBeGreaterThan(0);
      expect(p.stack.length).toBeGreaterThan(0);
    });
  });

  it('lists experience entries with a period and at least one point', () => {
    EXPERIENCE.forEach((e) => {
      expect(e.period).toMatch(/\d{2}\/\d{4}/);
      expect(e.points.length).toBeGreaterThan(0);
    });
  });

  it('uses unique navigation ids', () => {
    const ids = NAV.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('project media', () => {
  it('points local files at /media/<project-id>/ and gives every image alt text', () => {
    PROJECTS.forEach((p) =>
      p.media.forEach((m) => {
        if (m.kind === 'image' || m.kind === 'video') expect(m.src.startsWith(`/media/${p.id}/`)).toBe(true);
        if (m.kind === 'image') expect(m.alt.trim().length).toBeGreaterThan(0);
        if (m.kind === 'youtube') expect(m.id).toMatch(/^[\w-]{6,20}$/);
      }),
    );
  });
});
