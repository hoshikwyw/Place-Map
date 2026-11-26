import { GridBone, Loading } from '@/components/skeleton'

/**
 * Home, category and search all lead with a heading and a grid of cards, so
 * one placeholder serves the three. Routes shaped differently - the place
 * page, the map, the suggest form - have a loading.tsx of their own, because
 * this one would otherwise stand in for them too.
 */
export default function LoadingPage() {
  return (
    <Loading>
      <GridBone />
    </Loading>
  )
}
