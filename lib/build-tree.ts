import type { FlatComment, CommentNode, SortMode } from '@/types'
import { controversialScore } from '@/lib/wilson-score'

export function buildTree(flat: FlatComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  const roots: CommentNode[] = []

  for (const c of flat) {
    map.set(c.id, { ...c, children: [] })
  }

  for (const c of flat) {
    const node = map.get(c.id)!
    if (c.parentId === null) {
      roots.push(node)
    } else {
      const parent = map.get(c.parentId)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node) // orphaned due to pagination edge case
      }
    }
  }

  return roots
}

// Only sorts root-level comments — children always stay in creation order (Reddit behavior)
export function sortCommentTree(nodes: CommentNode[], mode: SortMode): void {
  nodes.sort((a, b) => {
    switch (mode) {
      case 'best':
        return b.wilsonScore - a.wilsonScore
      case 'top':
        return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
      case 'new':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'old':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'controversial':
        return controversialScore(b.upvotes, b.downvotes) - controversialScore(a.upvotes, a.downvotes)
    }
  })
}
