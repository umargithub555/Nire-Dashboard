import './src/services/trackingTask'
import { AppRegistry } from 'react-native'

AppRegistry.registerHeadlessTask('TrackingScheduler', () => require('./src/services/headlessTracking').default)

import 'expo-router/entry'

