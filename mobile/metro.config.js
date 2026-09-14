const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

/**
 * Lets the app import `@place-map/shared` - the same schemas, types and
 * opening-hours logic the API, bot and web app use - without joining the pnpm
 * workspace.
 *
 * The app stays out of the workspace on purpose: pnpm links packages through
 * symlinks into a shared store, and Metro following those is a reliable source
 * of "unable to resolve module" failures. Expo only auto-configures monorepos
 * for workspace members, so this is done by hand, narrowly:
 *
 *  - `@place-map/shared` resolves straight to its TypeScript source.
 *  - Any package *that source* imports (zod) resolves from this app's own
 *    node_modules, as if the app had imported it. Metro never walks into the
 *    shared package's pnpm symlinks, and there is exactly one copy of zod.
 *
 * Everything else takes Expo's default resolution untouched.
 */

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, '../packages/shared')
const sharedEntry = path.join(sharedRoot, 'src', 'index.ts')

const config = getDefaultConfig(projectRoot)

// Metro only bundles files inside watched folders.
config.watchFolders = [...(config.watchFolders ?? []), sharedRoot]

// The shared package's own node_modules are pnpm symlinks into the root store.
// Keep Metro from crawling them - the resolver below never needs them.
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const sharedNodeModules = new RegExp(
  `^${escapeRegExp(path.join(sharedRoot, 'node_modules'))}[\\\\/].*`,
)
const existingBlockList = config.resolver.blockList
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : existingBlockList ? [existingBlockList] : []),
  sharedNodeModules,
]

const isBarePackage = (name) => !name.startsWith('.') && !path.isAbsolute(name)
const appOrigin = path.join(projectRoot, 'package.json')

const upstreamResolve = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolve ?? context.resolveRequest

  if (moduleName === '@place-map/shared') {
    return { type: 'sourceFile', filePath: sharedEntry }
  }

  const fromShared = context.originModulePath.startsWith(sharedRoot + path.sep)
  if (fromShared && isBarePackage(moduleName)) {
    return resolve({ ...context, originModulePath: appOrigin }, moduleName, platform)
  }

  return resolve(context, moduleName, platform)
}

module.exports = config
