import { Redirect, Tabs } from 'expo-router'
import { CalendarCheck, ChartNoAxesCombined, ClipboardList, House, UserRound } from 'lucide-react-native'
import { LoadingScreen } from '../../src/components/ui'
import { useApp } from '../../src/providers/AppProvider'
import { colors } from '../../src/theme'

export default function AppTabsLayout() {
  const { session, initializing } = useApp()
  if (initializing) return <LoadingScreen label="Loading your workday..." />
  if (!session) return <Redirect href="/sign-in" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 68, paddingTop: 7 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 1 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="visits" options={{ title: 'Visits', tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} strokeWidth={2.25} /> }} />
    </Tabs>
  )
}
