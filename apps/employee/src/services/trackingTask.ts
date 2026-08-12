import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { LOCATION_TASK_NAME, normalizeLocation, uploadDeviceStatus, uploadLocationSamples } from './tracking'
import { getInstallationId } from '../lib/install'

type LocationTaskData = {
  locations?: Location.LocationObject[]
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  try {
    if (error) {
      await uploadDeviceStatus({ last_error: error.message }).catch(() => undefined)
      return
    }

    const payload = data as LocationTaskData | undefined
    const locations = payload?.locations ?? []
    if (locations.length === 0) return

    const installationId = await getInstallationId()
    await uploadLocationSamples(locations.map((location) => normalizeLocation(location, 'scheduled', installationId)))
  } catch (taskError) {
    await uploadDeviceStatus({
      last_error: taskError instanceof Error ? taskError.message : 'Background tracking upload failed',
    }).catch(() => undefined)
  }
})