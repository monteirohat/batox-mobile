// BatoX's look, the same as the web panel's (BatoX internal/web/static/css/base.css) and the
// theme's (batox-theme docs/STYLE.md): flat dark indigo surfaces over a sunset picture, white
// type, one white frame on what is selected, square corners, no glow and no shadow.
// A screen never writes a color, a size or a font: it names a token here.

export const colors = {
  bg: '#050B1A',
  // Surfaces: translucent at rest, so the picture shows a little through them
  surface: 'rgba(21, 18, 43, 0.82)',
  surface2: 'rgba(30, 25, 64, 0.84)',
  surfaceSolid: '#15122B',
  strip: '#1E1940',
  line: 'rgba(255, 255, 255, 0.12)',
  outline: 'rgba(255, 255, 255, 0.38)',
  // The selected surface, and the white frame around it
  selected: '#2E2659',
  selectedPressed: '#3A3170',
  frame: '#F2F4F8',
  // Type
  ink: '#FFFFFF',
  ink2: '#A9B7CC',
  ink3: '#6B7A90',
  // Sparingly
  accent: '#3B8CFF',
  link: '#8FBCFF',
  ok: '#4DD98B',
  signal: '#FFBF4C',
  danger: '#FC6C69',
} as const;

// Inter in three weights, as on the web panel: Light for names and large figures, Regular for
// everything else, SemiBold for the main button and a name standing for a missing logo.
export const fonts = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
} as const;

export const type = {
  title: { fontFamily: fonts.light, fontSize: 28, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.ink2 },
  label: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0.72, textTransform: 'uppercase', color: colors.ink2 },
  button: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
} as const;

export const space = {
  xs: 6,
  s: 12,
  m: 20,
  l: 28,
  xl: 40,
  // The side margin of every screen
  side: 24,
} as const;
