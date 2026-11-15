// The setup's colours and font on :root through CSSOM: the CSP allows no inline style.

import { COLORS, type ColorName, type Setup } from './setup'

type Rgb = [number, number, number]

const channel = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

export function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

/** A colour in sRGB as the browser paints it, or null when it is not one. Painting also resolves oklch(), names and the like. */
function rgb(value: string, paint: CanvasRenderingContext2D): Rgb | null {
  if (!CSS.supports('color', value)) return null
  paint.clearRect(0, 0, 1, 1)
  paint.fillStyle = value
  paint.fillRect(0, 0, 1, 1)
  const [r, g, b] = paint.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

const painter = () => document.createElement('canvas').getContext('2d', { willReadFrequently: true })!

/** A colour as #rrggbb, for a colour field. */
export function hex(value: string): string {
  const color = rgb(value, painter()) ?? [0, 0, 0]
  return `#${color.map(c => c.toString(16).padStart(2, '0')).join('')}`
}

const TOKEN: Record<ColorName, string> = {
  bakgrunn: 'bg', flate: 'surface', linje: 'line', tekst: 'text', dempet: 'muted', aksent: 'accent', lenke: 'link', forside: 'front', bakside: 'back',
}

/** Text over each fill: white or black, whichever reads better. */
const ON: ColorName[] = ['aksent', 'forside', 'bakside']

/** Text and links that must read at 4.5:1 on their ground (WCAG 2.2 AA). */
const PAIRS: [ColorName, ColorName][] = [['tekst', 'bakgrunn'], ['tekst', 'flate'], ['dempet', 'flate'], ['lenke', 'flate']]

export function applyTheme(setup: Setup): string[] {
  const problems: string[] = []
  const root = document.documentElement
  root.removeAttribute('style')
  const paint = painter()
  for (const mode of ['light', 'dark'] as const) {
    const resolved = {} as Record<ColorName, Rgb>
    for (const name of COLORS) {
      const value = setup.colors[name][mode]
      const color = rgb(value, paint)
      if (!color) {
        problems.push(`Oppsett.md: «${value}» er ikke en farge (${name})`)
        continue
      }
      resolved[name] = color
      root.style.setProperty(`--${TOKEN[name]}-${mode}`, value)
    }
    for (const name of ON) {
      if (!resolved[name]) continue
      const on = contrast(WHITE, resolved[name]) >= contrast(BLACK, resolved[name]) ? '#ffffff' : '#000000'
      root.style.setProperty(`--on-${TOKEN[name]}-${mode}`, on)
    }
    for (const [fore, ground] of PAIRS) {
      if (resolved[fore] && resolved[ground] && contrast(resolved[fore], resolved[ground]) < 4.5) {
        problems.push(`Oppsett.md: Kontrasten mellom ${fore} og ${ground} er under 4,5:1 i ${mode === 'light' ? 'lys' : 'mørk'} modus`)
      }
    }
  }
  if (setup.font) root.style.setProperty('--font', `"${setup.font}", system-ui, sans-serif`)
  root.style.setProperty('--size', `${setup.size / 16}rem`)
  document.title = setup.name
  return problems
}
