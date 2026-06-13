import { useEffect, useRef } from 'react'

const HOLD_THRESHOLD_MS = 200
const DOUBLE_TAP_WINDOW_MS = 400

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type.toLowerCase()
    return ['text', 'date', 'email', 'search', 'url', 'tel', 'password', 'number'].includes(type)
  }
  return false
}

export function usePushToTalk(
  enabled: boolean,
  onStart: () => void,
  onStop: () => void,
  onDoubleTap?: () => void,
) {
  const holdingRef = useRef(false)
  const holdTimerRef = useRef<number | null>(null)
  const lastTapAtRef = useRef(0)
  const onStartRef = useRef(onStart)
  const onStopRef = useRef(onStop)
  const onDoubleTapRef = useRef(onDoubleTap)

  onStartRef.current = onStart
  onStopRef.current = onStop
  onDoubleTapRef.current = onDoubleTap

  useEffect(() => {
    if (!enabled) {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
      if (holdingRef.current) {
        holdingRef.current = false
        onStopRef.current()
      }
      lastTapAtRef.current = 0
      return
    }

    const clearHoldTimer = () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
    }

    const start = () => {
      if (holdingRef.current) return
      holdingRef.current = true
      onStartRef.current()
    }

    const stop = () => {
      if (!holdingRef.current) return
      holdingRef.current = false
      onStopRef.current()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      if (event.repeat || isTextInputTarget(event.target)) return
      event.preventDefault()

      if (holdingRef.current || holdTimerRef.current !== null) return

      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null
        start()
      }, HOLD_THRESHOLD_MS)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      if (isTextInputTarget(event.target)) return
      event.preventDefault()

      const hadPendingHold = holdTimerRef.current !== null
      clearHoldTimer()

      if (holdingRef.current) {
        stop()
        return
      }

      if (!hadPendingHold) return

      const now = Date.now()
      if (now - lastTapAtRef.current <= DOUBLE_TAP_WINDOW_MS) {
        lastTapAtRef.current = 0
        onDoubleTapRef.current?.()
        return
      }

      lastTapAtRef.current = now
    }

    const onBlur = () => {
      clearHoldTimer()
      stop()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      clearHoldTimer()
      stop()
      lastTapAtRef.current = 0
    }
  }, [enabled])
}
