// Templates: the setup and one file per module; `{navn}` becomes the tab's name.

import setup from '../templates/Oppsett.md?raw'
import hurtigtaster from '../templates/hurtigtaster.md?raw'
import oppslag from '../templates/oppslag.md?raw'
import kort from '../templates/kort.md?raw'
import steg from '../templates/steg.md?raw'
import chrome from '../templates/bibliotek/hurtigtaster-chrome.md?raw'
import edge from '../templates/bibliotek/hurtigtaster-edge.md?raw'
import type { Module } from './content'

export const SETUP_TEMPLATE = setup

const MODULE_TEMPLATES: Record<Module, string> = { hurtigtaster, oppslag, kort, steg }

/** The first files in an empty folder: one tab per module. */
export const STARTER: Record<string, Module> = {
  'Hurtigtaster.md': 'hurtigtaster',
  'Oppslag.md': 'oppslag',
  'Kort.md': 'kort',
  'Steg.md': 'steg',
}

export const template = (module: Module, name: string) => MODULE_TEMPLATES[module].replaceAll('{navn}', name)

/** Ready-made lists to start a tab from. */
export const LIBRARY = {
  chrome: { name: 'Chrome', description: 'Hurtigtastene i Google Chrome', module: 'hurtigtaster', text: chrome },
  edge: { name: 'Edge', description: 'Hurtigtastene i Microsoft Edge', module: 'hurtigtaster', text: edge },
} as const satisfies Record<string, { name: string; description: string; module: Module; text: string }>

export type LibraryKey = keyof typeof LIBRARY
