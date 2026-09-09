import { Redirect, Tabs } from 'expo-router'
import { CalendarCheck, ChartNoAxesCombined, ClipboardList, House, UserRound } from 'lucide-react-native'
import { LoadingScreen } from '../../src/components/ui'
import { useApp } from '../../src/providers/AppProvider'
import { colors } from '../../src/theme'
import { AppState, Platform } from 'react-native'
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

    async function evaluatePermissions() {
      const completed = await hasCompletedOnboarding()
      const state = await checkAllPermissions()
      setPermissionsState(state)
      if (!completed || !state.allGranted) {
        setShowOnboarding(true)
      } else {
        setShowOnboarding(false)
      }
    }

    void evaluatePermissions()

    // Listen for app state changes (when user returns from system settings/battery prompt)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void checkAllPermissions().then((state) => {
          setPermissionsState(state)
          if (state.allGranted) {
            void markOnboardingCompleted()
            setShowOnboarding(false)
          }
        })
      }
    })

    return () => {
      subscription.remove()
    }
  }, [session])

  function handleOnboardingCompleted(newState: AppPermissionsState) {
    setPermissionsState(newState)
    void markOnboardingCompleted()
    setShowOnboarding(false)
  }

  function handleDismiss() {
    void markOnboardingCompleted()
    setShowOnboarding(false)
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
        onDismiss={handleDismiss}
      />
    </>
  )
}