import { describe, expect, it } from 'vitest'
import { paginate } from '../src/lib/response'

describe('paginate', () => {
  it('maps page 1 to the first range', () => {
    const { from, to } = paginate(1, 20, 137)
    expect([from, to]).toEqual([0, 19])
  })

  it('maps page 3 to the right offset', () => {
    const { from, to } = paginate(3, 20, 137)
    expect([from, to]).toEqual([40, 59])
  })

  it('reports has_more while rows remain', () => {
    expect(paginate(1, 20, 137).meta.has_more).toBe(true)
  })

  it('clears has_more on the last page', () => {
    // 137 rows, 20 per page -> page 7 holds rows 121-137
    expect(paginate(7, 20, 137).meta.has_more).toBe(false)
  })

  it('clears has_more when a page exactly consumes the rows', () => {
    expect(paginate(2, 20, 40).meta.has_more).toBe(false)
  })

  it('handles an empty result set', () => {
    expect(paginate(1, 20, 0).meta).toEqual({ page: 1, limit: 20, total: 0, has_more: false })
  })
})
