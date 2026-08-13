import * as BackgroundTask from 'expo-background-task'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { dueScheduledSamples, LOCATION_HEALTH_TASK_NAME, LOCATION_TASK_NAME, markScheduledSamplesUploaded, normalizeLocation, uploadDeviceStatus, uploadLocationSamples } from './tracking'
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
    const samples = locations.map((location) => normalizeLocation(location, 'scheduled', installationId))
    const dueSamples = await dueScheduledSamples(samples)
    if (dueSamples.length === 0) return

    await uploadLocationSamples(dueSamples)
    await markScheduledSamplesUploaded(dueSamples)
  } catch (taskError) {
    await uploadDeviceStatus({
      last_error: taskError instanceof Error ? taskError.message : 'Background tracking upload failed',
    }).catch(() => undefined)
  }
})
TaskManager.defineTask(LOCATION_HEALTH_TASK_NAME, async () => {
  try {
    await uploadDeviceStatus({ last_error: null })
    return BackgroundTask.BackgroundTaskResult.Success
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})
