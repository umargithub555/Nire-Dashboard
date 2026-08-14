import '../src/services/trackingTask'
import { Stack } from 'expo-router'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppProvider } from '../src/providers/AppProvider'
import { colors } from '../src/theme'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <AppProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      </AppProvider>
    </SafeAreaProvider>
  )
}
