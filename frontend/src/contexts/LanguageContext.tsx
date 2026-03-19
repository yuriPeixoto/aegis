import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import i18n from '../lib/i18n'

const LanguageContext = createContext<string>(i18n.language)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState(i18n.language)

  useEffect(() => {
    const handler = (lng: string) => setLang(lng)
    i18n.on('languageChanged', handler)
    return () => i18n.off('languageChanged', handler)
  }, [])

  return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
