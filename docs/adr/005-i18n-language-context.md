# ADR-005: Solução de i18n para badges com react-i18next

**Status:** Accepted
**Date:** 2026-03-18

## Context

O Aegis frontend usa `react-i18next` para internacionalização (EN/PT-BR). Os componentes de badge (`StatusBadge`, `PriorityBadge`, `TypeBadge`) são renderizados dentro de listas (`TicketList` → `TicketRow`), e o `useTranslation()` dentro deles não causava re-render quando o idioma era trocado via `LanguageSwitcher`.

O problema raiz: `react-i18next` usa `useSyncExternalStore` internamente, e a propagação de mudanças para componentes profundamente aninhados dentro de listas memoizadas não funcionava de forma confiável nesta versão.

## Decision

Solução em duas partes:

1. **`LanguageContext`** — Context React customizado que escuta `i18n.on('languageChanged')` via `useEffect` e provê a string do idioma atual como valor reativo. Envolve toda a aplicação em `main.tsx`.

2. **`translations.ts`** — Lookup tables estáticas em JS puro (sem dependência do i18next), com funções `tStatus()`, `tPriority()`, `tType()`. Os badges consomem `useLanguage()` + estas funções em vez de `useTranslation()`.

```tsx
// Badge component pattern
const lang = useLanguage()
return <span>{tStatus(lang, status)}</span>
```

Todos os valores são normalizados com `.toUpperCase()` antes do lookup para compatibilizar com os valores lowercase vindos do banco.

## Consequences

- **Positivo:** Re-render garantido em qualquer nível de aninhamento; sem dependência de internals do react-i18next; lookup O(1)
- **Negativo:** Duplicação leve — as traduções de status/priority/type existem tanto em `translations.ts` quanto nos arquivos `.json` do i18next (usados pelo `FilterBar` via `t('status.OPEN')`)
- **Lição aprendida:** Para componentes de lista renderizados em alto volume, evitar `useTranslation()` e preferir valores derivados de contexto simples

## Future

Se o react-i18next corrigir o comportamento em versões futuras, `translations.ts` pode ser removido e os badges podem voltar a usar `useTranslation()` diretamente.
