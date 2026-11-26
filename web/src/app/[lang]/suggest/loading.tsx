import { Bone, Loading } from '@/components/skeleton'

/** The suggest page: a heading and a short form - not the card grid. */
export default function LoadingSuggest() {
  return (
    <Loading>
      <div className="max-w-xl">
        <Bone className="mb-3 h-9 w-2/3" />
        <Bone className="mb-8 h-4 w-full" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="mb-5">
            <Bone className="mb-2 h-4 w-24" />
            <Bone className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <Bone className="h-12 w-full rounded-full" />
      </div>
    </Loading>
  )
}
