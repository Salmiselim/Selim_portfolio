# Selim Salmi: Portfolio

Personal portfolio built with Angular 21 (standalone components, signals, SSR + prerendering).

## Run

```bash
npm install
npm start          # dev server on http://localhost:4200
npm run build      # production build (SSR, prerendered routes)
npm test
```

## Structure

- `src/app/data/portfolio.data.ts`: **single source of truth** for all content (profile, experience, skills, education, projects). Edit this file to update the site.
- `src/app/home`, `src/app/project`: home page and project case-study pages.
- `src/app/layout`: header (scroll-spy, full-screen mobile menu) and footer.
- `src/app/shared`: icons, project cover art, media player + gallery (lightbox).
- `src/app/core`: SEO service.
- `src/styles.css`: design tokens (deep violet-black + purple), fonts Anton / Inter / JetBrains Mono (self-hosted in `src/assets/fonts`).
- `src/app/arcade.component.ts` and `games/`: the Snake / Breaker mini-games.
- `public/resume.pdf`: the résumé linked from the site.

## Adding screenshots and demo videos

1. Drop files into `public/media/<project-id>/`. All media lives inside the project, so the site keeps working if you delete the originals elsewhere.
2. List them on the project in `src/app/data/portfolio.data.ts`:

```ts
media: [
  { kind: 'video', src: '/media/meganopoly-xr/demo.mp4', poster: '/media/meganopoly-xr/poster.jpg' },
  { kind: 'youtube', id: 'VIDEO_ID' },   // from youtube.com/watch?v=VIDEO_ID
  { kind: 'image', src: '/media/meganopoly-xr/lobby.jpg', alt: 'Four players in the lobby', caption: 'Lobby' },
],
```

The first video (or first item) becomes the big player; images open in a full-screen viewer.
Projects without media show their vector cover art. Optional per project: `cover` (landscape card image on the home page), `poster` (portrait key art, shown in the itch.io section for games), and `fit: 'contain'` on an image to show the whole picture (good for UI screenshots).
Set `SHOWREEL` in the same file to play a showreel in the hero.

Tips: screenshots as .jpg/.webp around 1920px wide; videos as H.264 .mp4 under ~25 MB, or upload to YouTube.

`_old/` holds previous versions of the site for reference and can be deleted.

## Private visitor statistics (Umami)

The site sends anonymous, cookie-free stats to **Umami Cloud** (free plan). Your dashboard is
https://cloud.umami.is, behind your own login. The portfolio has no admin page, so there is nothing for anyone else to open.

Setup:
1. Sign up at https://cloud.umami.is, then **Add website** (name + your domain).
2. Copy the **Website ID** and paste it into `ANALYTICS.umamiWebsiteId` in `src/app/data/portfolio.data.ts`.
3. Commit + push; Vercel deploys and stats start arriving. Nothing is tracked on localhost.

What you will see: visitors, page views, countries/cities, devices/browsers, where people came from
(LinkedIn, Google, GitHub...), which project pages they opened, live visitors, plus these events:
`resume-download`, `itch-click` (with the game), `linkedin-click`, `github-click`, `email-click`,
`email-copy`, `video-play` (with the project), `screenshot-open` (with the project).
Each click event also records `from` (hero, header, contact, footer, poster...).

Exclude your own visits: open your live site once, press F12 → Console, run
`localStorage.setItem('umami.disabled', 1)` (do it on each browser/phone you use).

