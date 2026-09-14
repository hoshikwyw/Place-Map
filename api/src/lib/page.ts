/**
 * PostgREST's code for a range that starts past the last row. It answers such a
 * request with HTTP 416 instead of an empty page.
 */
const RANGE_NOT_SATISFIABLE = 'PGRST103'

interface PageResult {
  // Untyped rows: this project does not generate Supabase database types.
  data: any[] | null
  error: { code?: string; message: string } | null
  count: number | null
}

/**
 * Runs one page of a paginated query, treating a page past the end as empty.
 *
 * Without this, `?page=99` surfaced as a 500 on every list, and a client could
 * not tell "no such page" from "the server broke". Here it becomes an empty
 * page with the real total, so the caller can answer with an honest 404.
 *
 * `run` builds the same query for any range; on a 416 it runs again for the
 * first row only, to learn the total without fetching the list.
 */
export async function fetchPage(
  run: (from: number, to: number) => PromiseLike<PageResult>,
  from: number,
  to: number,
): Promise<PageResult> {
  const page = await run(from, to)
  if (page.error?.code !== RANGE_NOT_SATISFIABLE) return page

  const probe = await run(0, 0)
  return { data: [], error: probe.error, count: probe.count }
}
