// The template library: packs of tab files shipped with the app. A file's text loads only when it is needed.

import { strToU8, zipSync } from 'fflate'
import { parse } from 'yaml'
import { MODULES, type Module } from './content'
import { MODULE_INFO, MODULE_TEMPLATES } from './templates'

export interface LibraryTemplate {
  /** `pakke/fil.md`, unique in the library. */
  id: string
  name: string
  module: Module
  description: string
  load(): Promise<string>
}

export interface Pack {
  id: string
  name: string
  description: string
  templates: LibraryTemplate[]
}

type PackFile = { navn: string; beskrivelse: string; maler: { fil: string; navn: string; modul: Module; beskrivelse?: string }[] }

const DIR = '../templates/bibliotek/'
const META = import.meta.glob<string>('../templates/bibliotek/*/pakke.yaml', { query: '?raw', import: 'default', eager: true })
export const FILES = import.meta.glob<string>('../templates/bibliotek/*/*.md', { query: '?raw', import: 'default' })

/** One tab per module with examples of everything it shows, first in the library. */
const START: Pack = {
  id: 'kom-i-gang',
  name: 'Kom i gang',
  description: 'Én fane per modul, med eksempler på alt fanen kan vise',
  templates: MODULES.map(module => ({
    id: `kom-i-gang/${module}.md`,
    name: MODULE_INFO[module][0],
    module,
    description: MODULE_INFO[module][1],
    load: async () => MODULE_TEMPLATES[module],
  })),
}

export const PACKS: Pack[] = [
  START,
  ...Object.entries(META)
    .map(([path, text]) => {
      const id = path.slice(DIR.length, -'/pakke.yaml'.length)
      const pack = parse(text) as PackFile
      return {
        id,
        name: pack.navn,
        description: pack.beskrivelse,
        templates: pack.maler.map(t => ({
          id: `${id}/${t.fil}`,
          name: t.navn,
          module: t.modul,
          description: t.beskrivelse ?? '',
          load: FILES[`${DIR}${id}/${t.fil}`],
        })),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
]

/** The file as it lands in the folder: named after the tab. */
export const fileText = async (template: LibraryTemplate, name = template.name) => (await template.load()).replaceAll('{navn}', name)

/** A pack as one zip, one file per template. */
export async function packZip(pack: Pack): Promise<Blob> {
  const files: Record<string, Uint8Array> = {}
  for (const t of pack.templates) files[`${t.name}.md`] = strToU8(await fileText(t))
  return new Blob([zipSync(files) as Uint8Array<ArrayBuffer>], { type: 'application/zip' })
}
