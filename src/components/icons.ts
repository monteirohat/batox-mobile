// The menu's icons: the BatoX web panel's own (its index.html, 24-unit grid, drawn with a 2 px
// stroke), so both menus look the same. Generated from the web panel; keep them in step with it.

export const ICONS = {
  dashboard: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 20h8M12 16v4\"/>",
  games: "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><path d=\"M9 7h6v5H9zM9 17v1M12 17v1M15 17v1\"/>",
  consoles: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 20h8M12 16v4\"/><path d=\"M8.5 10h3M10 8.5v3M15 10h.01\"/>",
  upload: "<path d=\"M12 15V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4\"/>",
  bios: "<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"1\"/><rect x=\"9.5\" y=\"9.5\" width=\"5\" height=\"5\"/><path d=\"M9.5 2v4M14.5 2v4M9.5 18v4M14.5 18v4M2 9.5h4M2 14.5h4M18 9.5h4M18 14.5h4\"/>",
  library: "<path d=\"M4 4h4v16H4zM10 4h4v16h-4zM16.5 5l3.5-.9 3 15.6-3.5.9z\"/>",
  music: "<path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/>",
  messages: "<path d=\"M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z\"/><path d=\"M8.5 10.5h7M8.5 14h4.5\"/>",
  timer: "<circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 9v4l2.5 2.5M9.5 2.5h5M19 5l-1.5 1.5\"/>",
  es: "<rect x=\"2\" y=\"7\" width=\"20\" height=\"11\" rx=\"5\"/><path d=\"M7 11v3M5.5 12.5h3M15 12h.01M18 13h.01\"/>",
  video: "<rect x=\"2\" y=\"4\" width=\"13\" height=\"10\" rx=\"2\"/><path d=\"M5.5 19h6M8.5 14v5\"/><rect x=\"18\" y=\"7\" width=\"4\" height=\"9\" rx=\"1\"/>",
  audio: "<path d=\"M11 5 6 9H3v6h3l5 4z\"/><path d=\"M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13\"/>",
  batocera: "<path d=\"M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0\"/><circle cx=\"16\" cy=\"6\" r=\"2\"/><circle cx=\"10\" cy=\"12\" r=\"2\"/><circle cx=\"18\" cy=\"18\" r=\"2\"/>",
  extensions: "<path d=\"M4 7h4V5.5a2.5 2.5 0 0 1 5 0V7h4v4h-1.5a2.5 2.5 0 0 0 0 5H17v4h-4v-1.5a2.5 2.5 0 0 0-5 0V20H4v-4h1.5a2.5 2.5 0 0 0 0-5H4z\"/>",
  logs: "<path d=\"M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01\"/>",
  access: "<circle cx=\"8\" cy=\"15\" r=\"4\"/><path d=\"M11 12l9-9M17 6l3 3M14 9l2 2\"/>",
  open: "<path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"/><path d=\"M15 3h6v6M10 14 21 3\"/>",
  switch: "<path d=\"m17 1 4 4-4 4\"/><path d=\"M3 11V9a4 4 0 0 1 4-4h14\"/><path d=\"m7 23-4-4 4-4\"/><path d=\"M21 13v2a4 4 0 0 1-4 4H3\"/>",
  // The web panel's details icon (views/games.js)
  about: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7.5v.01\"/>",
} as const;

export type IconName = keyof typeof ICONS;
