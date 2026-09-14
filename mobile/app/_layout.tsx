import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import Constants from 'expo-constants'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, Text } from 'react-native'
import { LocaleProvider, useI18n } from '../src/i18n'
import { PERSIST_MAX_AGE, persister, queryClient } from '../src/query'
import { useTheme } from '../src/theme'

export default function RootLayout() {
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
    <Pressable accessibilityRole="button" onPress={toggle} hitSlop={12}>
      <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>{text.switchTo}</Text>
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
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: text.appName, headerRight: () => <LanguageToggle /> }} />
        <Stack.Screen name="search" options={{ title: text.search }} />
        {/* Titles for these two are set by the screens, from their data. */}
        <Stack.Screen name="category/[slug]" options={{ title: '' }} />
        <Stack.Screen name="place/[slug]" options={{ title: '' }} />
      </Stack>
    </>
  )
}
