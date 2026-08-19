import './src/services/trackingTask'
import { AppRegistry } from 'react-native'
import { registerRootComponent } from 'expo'
import App from './App'

// Register headless task invoked by TrackingAlarmReceiver when the alarm fires
AppRegistry.registerHeadlessTask('TrackingScheduler', () => require('./src/services/headlessTracking').default)

registerRootComponent(App)
