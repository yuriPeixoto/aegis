import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent, Literal } from 'mdast'

// Custom mdast node — kept distinct from "strong" so the Markdown component's
// remark-rehype handler can style @mentions (e.g. amber) separately from
// real Markdown bold text.
export interface Mention extends Literal {
  type: 'mention'
}

// Splits text nodes on @mentions into Mention nodes, same highlight the
// internal-note thread used before Markdown rendering existed.
export function remarkMentions() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      const regex = /@\w+/g
      const matches = [...node.value.matchAll(regex)]
      if (matches.length === 0) return

      const replacement: PhrasingContent[] = []
      let cursor = 0
      for (const match of matches) {
        const start = match.index ?? 0
        if (start > cursor) {
          replacement.push({ type: 'text', value: node.value.slice(cursor, start) })
        }
        const mention: Mention = { type: 'mention', value: match[0] }
        replacement.push(mention as unknown as PhrasingContent)
        cursor = start + match[0].length
      }
      if (cursor < node.value.length) {
        replacement.push({ type: 'text', value: node.value.slice(cursor) })
      }

      parent.children.splice(index, 1, ...replacement)
    })
  }
}
