import { Redirect, Tabs } from 'expo-router'
import { CalendarCheck, ChartNoAxesCombined, ClipboardList, House, UserRound } from 'lucide-react-native'
import { LoadingScreen } from '../../src/components/ui'
import { useApp } from '../../src/providers/AppProvider'
import { colors } from '../../src/theme'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import React, { useEffect, useState } from 'react'
import { OnboardingPermissionModal } from '../../src/components/OnboardingPermissionModal'
import {
  AppPermissionsState,
  checkAllPermissions,
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from '../../src/services/permissions'

export default function AppTabsLayout() {
  const { session, initializing } = useApp()
  const insets = useSafeAreaInsets()

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [permissionsState, setPermissionsState] = useState<AppPermissionsState | null>(null)

  useEffect(() => {
    if (!session) return
    ;(async () => {
      const completed = await hasCompletedOnboarding()
      const state = await checkAllPermissions()
      setPermissionsState(state)
      // Show modal if onboarding not done OR any required permission is missing
      if (!completed || !state.allGranted) {
        setShowOnboarding(true)
      }
    })()
  }, [session])

  function handleOnboardingCompleted(newState: AppPermissionsState) {
    setPermissionsState(newState)
    if (newState.allGranted) {
      void markOnboardingCompleted()
      setShowOnboarding(false)
    }
    // If not all granted, keep modal open so user can open settings
    // but still allow dismissing by going back
  }

  if (initializing) return <LoadingScreen label="Loading your workday..." />
  if (!session) return <Redirect href="/sign-in" />

  const tabBottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 12 : 8)
  const tabBarHeight = 56 + tabBottomPadding

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingTop: 6,
            paddingBottom: tabBottomPadding,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 1 },
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={2.25} /> }} />
        <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} strokeWidth={2.25} /> }} />
        <Tabs.Screen name="visits" options={{ title: 'Visits', tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} strokeWidth={2.25} /> }} />
        <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} strokeWidth={2.25} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} strokeWidth={2.25} /> }} />
      </Tabs>

      <OnboardingPermissionModal
        visible={showOnboarding}
        permissionsState={permissionsState}
        onCompleted={handleOnboardingCompleted}
      />
    </>
  )
}