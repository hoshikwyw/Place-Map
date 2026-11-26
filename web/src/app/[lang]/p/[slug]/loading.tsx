import { Bone, Loading } from '@/components/skeleton'

/** The place page: name and facts, the photo, then the two columns. */
export default function LoadingPlace() {
  return (
    <Loading>
      <Bone className="mb-4 h-9 w-28 rounded-full" />
      <Bone className="mb-4 h-10 w-2/3" />
      <div className="mb-6 flex gap-5">
        <Bone className="h-8 w-24 rounded-full" />
        <Bone className="h-8 w-16" />
        <Bone className="h-8 w-20" />
      </div>
      {/* The gallery caps its photo at 28rem; so does this. */}
      <Bone className="mb-8 aspect-[16/9] max-h-[28rem] w-full rounded-xl" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-3">
          <Bone className="h-4 w-20" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-4/5" />
        </div>
        <div className="space-y-4 surface p-5">
          <Bone className="h-10 w-full" />
          <Bone className="h-10 w-full" />
          <Bone className="h-12 w-full rounded-full" />
        </div>
      </div>
    </Loading>
  )
}
