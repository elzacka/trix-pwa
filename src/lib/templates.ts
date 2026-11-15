// Templates: the setup and one file per module; `{navn}` becomes the tab's name.

import setup from '../templates/Oppsett.md?raw'
import hurtigtaster from '../templates/hurtigtaster.md?raw'
import oppslag from '../templates/oppslag.md?raw'
import kort from '../templates/kort.md?raw'
import steg from '../templates/steg.md?raw'
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
