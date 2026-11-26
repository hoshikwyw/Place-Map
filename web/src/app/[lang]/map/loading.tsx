import { Bone, Loading } from '@/components/skeleton'

/** The map page: heading, a row of chips, and the map at its real height. */
export default function LoadingMap() {
  return (
    <Loading>
      <Bone className="mb-3 h-9 w-40" />
      <Bone className="mb-5 h-4 w-72 max-w-full" />
      <div className="mb-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Bone key={i} className="h-11 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <Bone className="h-[70vh] min-h-80 w-full rounded-xl" />
    </Loading>
  )
}
