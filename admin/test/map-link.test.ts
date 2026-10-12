import { describe, expect, it } from 'vitest'
import { isFetchableMapHost, needsResolving, parseMapLink } from '@/lib/map-link'

/**
 * Reading coordinates out of whatever somebody pasted.
 *
 * Every URL below is a real shape a map produces, which is the point: a parser
 * for map links is only worth having if it handles the links people actually
 * have, and the way to know is to write them down.
 */

const YANGON = { lat: 16.7751, lng: 96.1605 }

describe('a Google Maps place link', () => {
  it('reads the pin rather than the viewport', () => {
    // Both are in this URL and they are different points. `@` is where the map
    // happened to be centred; `!3d!4d` is the place. Taking the wrong one puts
    // every place slightly off, consistently, and invisibly.
    const url =
      'https://www.google.com/maps/place/Cafe/@16.7800,96.1700,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d16.7751!4d96.1605'
    expect(parseMapLink(url)).toEqual(YANGON)
  })

  it('falls back to the viewport when there is no pin', () => {
    expect(parseMapLink('https://www.google.com/maps/@16.7751,96.1605,17z')).toEqual(YANGON)
  })

  it('reads a place link with a name in the path', () => {
    const url = 'https://www.google.com/maps/place/Shwedagon+Pagoda/@16.7751,96.1605,15z'
    expect(parseMapLink(url)).toEqual(YANGON)
  })

  it('reads the ?q= form', () => {
    expect(parseMapLink('https://maps.google.com/?q=16.7751,96.1605')).toEqual(YANGON)
  })

  it('reads the search API form', () => {
    expect(
      parseMapLink('https://www.google.com/maps/search/?api=1&query=16.7751,96.1605'),
    ).toEqual(YANGON)
  })

  it('reads a directions link', () => {
    expect(
      parseMapLink('https://www.google.com/maps/dir/?api=1&destination=16.7751,96.1605'),
    ).toEqual(YANGON)
  })

  it('reads coordinates that arrived percent-encoded', () => {
    // What a share sheet produces when the comma is escaped.
    expect(parseMapLink('https://maps.google.com/?q=16.7751%2C96.1605')).toEqual(YANGON)
  })

  it('reads a negative coordinate', () => {
    expect(parseMapLink('https://www.google.com/maps/@-33.8688,151.2093,17z')).toEqual({
      lat: -33.8688,
      lng: 151.2093,
    })
  })
})

describe('other maps', () => {
  it('reads an Apple Maps link', () => {
    expect(parseMapLink('https://maps.apple.com/?ll=16.7751,96.1605&q=Cafe')).toEqual(YANGON)
  })

  it('reads an OpenStreetMap link', () => {
    expect(parseMapLink('https://www.openstreetmap.org/#map=17/16.7751/96.1605')).toEqual(YANGON)
  })

  it('reads a geo: link, which is what Android share sheets make', () => {
    expect(parseMapLink('geo:16.7751,96.1605')).toEqual(YANGON)
  })
})

describe('a pasted pair of numbers', () => {
  it('reads them', () => {
    expect(parseMapLink('16.7751, 96.1605')).toEqual(YANGON)
  })

  it('reads them with no space', () => {
    expect(parseMapLink('16.7751,96.1605')).toEqual(YANGON)
  })

  it('reads them with surrounding whitespace', () => {
    expect(parseMapLink('  16.7751 , 96.1605  ')).toEqual(YANGON)
  })

  it('reads whole numbers', () => {
    expect(parseMapLink('17,96')).toEqual({ lat: 17, lng: 96 })
  })
})

describe('what it refuses', () => {
  it('refuses empty input', () => {
    expect(parseMapLink('')).toBeNull()
    expect(parseMapLink('   ')).toBeNull()
  })

  it('refuses a link with no coordinates in it', () => {
    expect(parseMapLink('https://www.google.com/maps/place/Shwedagon+Pagoda')).toBeNull()
  })

  it('refuses an ordinary web page', () => {
    expect(parseMapLink('https://example.com/about')).toBeNull()
  })

  it('refuses a latitude that cannot exist', () => {
    // A transposed pair - 96 is a fine longitude and an impossible latitude -
    // which is exactly the mistake typing the numbers by hand produces.
    expect(parseMapLink('96.1605, 16.7751')).toBeNull()
  })

  it('refuses a longitude that cannot exist', () => {
    expect(parseMapLink('16.7751, 196.1605')).toBeNull()
  })

  it('refuses one number on its own', () => {
    expect(parseMapLink('16.7751')).toBeNull()
  })

  it('refuses words', () => {
    expect(parseMapLink('Shwedagon Pagoda, Yangon')).toBeNull()
  })

  it('refuses a short link, which carries no coordinates', () => {
    expect(parseMapLink('https://maps.app.goo.gl/AbCdEfGh')).toBeNull()
  })
})

describe('telling a short link apart from a bad one', () => {
  it('knows a Google short link has to be opened first', () => {
    expect(needsResolving('https://maps.app.goo.gl/AbCdEfGh')).toBe(true)
    expect(needsResolving('https://goo.gl/maps/AbCdEfGh')).toBe(true)
  })

  it('does not ask to open a link it can already read', () => {
    expect(needsResolving('https://www.google.com/maps/@16.7751,96.1605,17z')).toBe(false)
  })

  it('does not ask to open something that is not a map link', () => {
    expect(needsResolving('https://example.com/about')).toBe(false)
    expect(needsResolving('not a url')).toBe(false)
    expect(needsResolving('')).toBe(false)
  })
})

describe('which hosts the server will open', () => {
  it('opens map hosts', () => {
    expect(isFetchableMapHost('https://maps.app.goo.gl/AbCdEfGh')).toBe(true)
    expect(isFetchableMapHost('https://www.google.com/maps/place/x')).toBe(true)
    expect(isFetchableMapHost('https://maps.apple.com/?ll=1,2')).toBe(true)
  })

  it('opens nothing else, however harmless it looks', () => {
    expect(isFetchableMapHost('https://example.com/')).toBe(false)
  })

  it('will not reach inside the network it runs in', () => {
    // The reason this is an allowlist. A server action that fetches whatever
    // it is handed is a way to ask this server to make requests somebody else
    // cannot make.
    expect(isFetchableMapHost('http://localhost:8787/v1/health')).toBe(false)
    expect(isFetchableMapHost('http://169.254.169.254/latest/meta-data/')).toBe(false)
    expect(isFetchableMapHost('https://192.168.1.1/')).toBe(false)
    expect(isFetchableMapHost('http://[::1]/')).toBe(false)
  })

  it('refuses plain http even on a map host', () => {
    expect(isFetchableMapHost('http://maps.app.goo.gl/AbCdEfGh')).toBe(false)
  })

  it('is not fooled by a host that merely ends with a map host', () => {
    expect(isFetchableMapHost('https://maps.app.goo.gl.evil.test/x')).toBe(false)
    expect(isFetchableMapHost('https://notgoogle.com/maps')).toBe(false)
  })

  it('is not fooled by a map host in the path or the userinfo', () => {
    expect(isFetchableMapHost('https://evil.test/https://maps.app.goo.gl/x')).toBe(false)
    expect(isFetchableMapHost('https://maps.app.goo.gl@evil.test/x')).toBe(false)
  })
})
