import { Redirect } from 'expo-router'
import { LoadingScreen } from '../src/components/ui'
import { useApp } from '../src/providers/AppProvider'

export default function IndexPage() {
  const { session, initializing } = useApp()
  if (initializing) return <LoadingScreen label="Opening Nire..." />
  return <Redirect href={session ? '/home' : '/sign-in'} />
}
