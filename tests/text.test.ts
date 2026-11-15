import { describe, expect, it } from 'vitest'
import { frontmatter, isFileName, plain, slug, withoutComments } from '../src/lib/text'

describe('text', () => {
  it('slugs headings the way links name them', () => {
    expect(slug('Forbered deg på ekombortfall?')).toBe('forbered-deg-på-ekombortfall')
    expect(slug('**Fet** [lenke](https://x.no)')).toBe('fet-lenke')
  })
  it('strips inline markup', () => expect(plain('**a** *b* `c` [d](e)')).toBe('a b c d'))
  it('accepts only plain file names', () => {
    for (const ok of ['Oppslag.md', 'Mine rutiner.md', 'a.MD']) expect(isFileName(ok), ok).toBe(true)
    for (const bad of ['../a.md', 'a/b.md', 'a\\b.md', '.a.md', 'a.txt', 'C:a.md', '']) expect(isFileName(bad), bad).toBe(false)
  })
  it('splits frontmatter and keeps the body line', () => {
    expect(frontmatter('---\na: 1\n---\n# T\n')).toEqual({ yaml: 'a: 1', body: '# T\n', bodyLine: 4 })
    expect(frontmatter('# T').yaml).toBeNull()
  })
  it('blanks comments but keeps the lines', () => {
    expect(withoutComments(['a <!-- b', 'c', 'd --> e', 'f'])).toEqual(['a ', '', ' e', 'f'])
  })
})
