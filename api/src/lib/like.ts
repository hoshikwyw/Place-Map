/** PostgREST treats these as wildcards/separators inside a filter value. */
export const escapeLike = (value: string) => value.replace(/[%_,()*\\]/g, '')
