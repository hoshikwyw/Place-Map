import { Image, type ImageStyle } from 'expo-image'

/** Rendered by scripts/src/generate-brand.ts, like every other brand asset. */
const source = require('../../assets/mascot.png')

/**
 * The brand mascot. Decorative wherever it appears - the text beside it carries
 * the meaning - so it is hidden from screen readers.
 */
export function Mascot({ size = 96, style }: { size?: number; style?: ImageStyle }) {
  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  )
}
