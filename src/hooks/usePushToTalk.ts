import { useEffect, useRef } from 'react'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

export function usePushToTalk(
  enabled: boolean,
  onStart: () => void,
  onStop: () => void,
) {
  const holdingRef = useRef(false)
  const onStartRef = useRef(onStart)
  const onStopRef = useRef(onStop)

  onStartRef.current = onStart
  onStopRef.current = onStop

  useEffect(() => {
    if (!enabled) {
      if (holdingRef.current) {
        holdingRef.current = false
        onStopRef.current()
      }
      return
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
      if (event.repeat || isEditableTarget(event.target)) return
      event.preventDefault()
      start()
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      stop()
    }

    const onBlur = () => stop()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      stop()
    }
  }, [enabled])
}
