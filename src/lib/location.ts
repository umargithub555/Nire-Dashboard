export type CapturedLocation = {
  lat: number
  lng: number
  accuracy: number
}

type CaptureLocationOptions = {
  desiredAccuracyMeters?: number
  maxWaitMs?: number
  onUpdate?: (accuracy: number) => void
}

export function captureBestLocation({
  desiredAccuracyMeters = 50,
  maxWaitMs = 15000,
  onUpdate,
}: CaptureLocationOptions = {}) {
  return new Promise<CapturedLocation>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by your browser'))
      return
    }

    let bestPosition: GeolocationPosition | null = null
    let settled = false
    let watchId: number | null = null

    const cleanup = () => {
      settled = true
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      window.clearTimeout(timeoutId)
    }

    const finishWithBest = () => {
      if (settled) return
      cleanup()

      if (!bestPosition) {
        reject(new Error('Could not get your location. Please allow location access and try again.'))
        return
      }

      resolve({
        lat: bestPosition.coords.latitude,
        lng: bestPosition.coords.longitude,
        accuracy: bestPosition.coords.accuracy,
      })
    }

    const timeoutId = window.setTimeout(finishWithBest, maxWaitMs)

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const currentAccuracy = position.coords.accuracy
        const bestAccuracy = bestPosition?.coords.accuracy ?? Number.POSITIVE_INFINITY

        if (currentAccuracy < bestAccuracy) {
          bestPosition = position
          onUpdate?.(Math.round(currentAccuracy))
        }

        if (currentAccuracy <= desiredAccuracyMeters) finishWithBest()
      },
      (error) => {
        if (bestPosition) {
          finishWithBest()
          return
        }

        cleanup()
        reject(new Error(error.message || 'Location access denied. Please allow location in browser.'))
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: maxWaitMs,
      }
    )
  })
}
