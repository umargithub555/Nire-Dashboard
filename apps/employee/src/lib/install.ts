import AsyncStorage from '@react-native-async-storage/async-storage'

const INSTALLATION_ID_KEY = 'nire.installationId'

export async function getInstallationId() {
  const existing = await AsyncStorage.getItem(INSTALLATION_ID_KEY)
  if (existing) return existing

  const id = `android-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, id)
  return id
}
