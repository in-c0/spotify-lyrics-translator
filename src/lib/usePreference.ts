// A useState that remembers the viewer's choice in localStorage (best effort).
import { useEffect, useState } from 'react'

export function usePreference<T>(key: string, initial: T): [T, (value: T) => void] {
  const storageKey = `slt:${key}`
  const [value, setValue] = useState<T>(initial)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) setValue(JSON.parse(stored))
    } catch {
      /* storage unavailable: keep the default */
    }
  }, [storageKey])

  const update = (next: T) => {
    setValue(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  return [value, update]
}
