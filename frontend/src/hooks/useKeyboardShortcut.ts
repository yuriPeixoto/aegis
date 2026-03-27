import { useEffect } from 'react'

type ShortcutHandler = (event: KeyboardEvent) => void

interface UseKeyboardShortcutOptions {
  enabled?: boolean
  ignoreInputs?: boolean
}

export function useKeyboardShortcut(
  key: string,
  callback: ShortcutHandler,
  options: UseKeyboardShortcutOptions = {}
) {
  const { enabled = true, ignoreInputs = true } = options

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Se ignoreInputs for true, não dispara se estiver em um input, textarea ou select
      if (ignoreInputs) {
        const target = event.target as HTMLElement
        const isInput =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.tagName === 'SELECT'

        if (isInput) return
      }

      // Verifica se a tecla pressionada coincide (case-insensitive para letras simples)
      const pressedKey = event.key.toLowerCase()
      const targetKey = key.toLowerCase()

      // Suporte simples para combinações com Ctrl ou Meta (Cmd no Mac)
      const isCtrlOrMeta = event.ctrlKey || event.metaKey
      const isShift = event.shiftKey
      const isAlt = event.altKey
      
      if (targetKey.startsWith('ctrl+')) {
        const actualKey = targetKey.split('+')[1]
        if (isCtrlOrMeta && !isAlt && pressedKey === actualKey) {
          event.preventDefault()
          callback(event)
        }
      } else if (targetKey.startsWith('alt+')) {
        const actualKey = targetKey.split('+')[1]
        if (isAlt && !isCtrlOrMeta && pressedKey === actualKey) {
          event.preventDefault()
          callback(event)
        }
      } else if (pressedKey === targetKey && !isCtrlOrMeta && !isAlt && !isShift) {
        // Tecla simples (sem modificadores)
        callback(event)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, callback, enabled, ignoreInputs])
}
