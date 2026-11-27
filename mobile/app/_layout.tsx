// Plus Jakarta Sans, the brand typeface (packages/shared brand.ts), as on the
// website and the dashboard. One import path per weight, never the package
// root: the root pulls every weight and italic into the app - 14 files - where
// these 4 are all it uses. Static files, one per weight: SDK 57 has no variable
// font support on Android and iOS (that arrives in SDK 58).
// Fraunces for headlines, one weight - the same rule.
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold'
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular'
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium'
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold'
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import Constants from 'expo-constants'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Pressable } from 'react-native'
import { Text } from '../src/components/text'
import { LocaleProvider, useI18n } from '../src/i18n'
import { PERSIST_MAX_AGE, persister, queryClient } from '../src/query'
import { fonts, radius, useTheme } from '../src/theme'

// Keep the splash screen up until the font is ready, so text never renders in
// the system font first and then jumps.
SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Fraunces_600SemiBold,
  })

  useEffect(() => {
    // On a font error, carry on in the system font rather than hang on the splash.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {})
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        // A new app version discards the saved cache, so data shaped for an
        // older build is never read by a newer one.
        buster: Constants.expoConfig?.version ?? '0',
      }}
    >
      <LocaleProvider>
        <Navigator />
      </LocaleProvider>
    </PersistQueryClientProvider>
  )
}

function LanguageToggle() {
  const theme = useTheme()
  const { text, toggle } = useI18n()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={toggle}
      hitSlop={12}
      style={({ pressed }) => ({
        backgroundColor: theme.accentSoft,
        borderRadius: radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 5,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text weight="bold" tone="accent" style={{ fontSize: 13 }}>
        {text.switchTo}
      </Text>
    </Pressable>
  )
}

function Navigator() {
  const theme = useTheme()
  const { text } = useI18n()

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: { fontFamily: fonts.display, fontSize: 20 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        {/* The home banner carries the name, so the bar stays empty there;
            `title` still names the screen for the back button. */}
        <Stack.Screen
          name="index"
          options={{ title: text.appName, headerTitle: '', headerRight: () => <LanguageToggle /> }}
        />
        <Stack.Screen name="search" options={{ title: text.search }} />
        {/* Titles for these two are set by the screens, from their data. */}
        <Stack.Screen name="category/[slug]" options={{ title: '' }} />
        <Stack.Screen name="place/[slug]" options={{ title: '' }} />
      </Stack>
    </>
  )
}
