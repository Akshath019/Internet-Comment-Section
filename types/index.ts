export type SortMode = 'best' | 'top' | 'new' | 'old' | 'controversial'

export interface CommentUser {
  id: string
  username: string | null
  avatarUrl: string | null
}

export interface FlatComment {
  id: string
  threadId: string
  userId: string | null
  parentId: string | null
  content: string | null
  path: string
  depth: number
  upvotes: number
  downvotes: number
  wilsonScore: number
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  user: CommentUser | null
  userVote: number | null
}

export interface CommentNode extends FlatComment {
  children: CommentNode[]
}

export interface ThreadData {
  id: string
  normalizedUrl: string
  originalUrl: string
  domain: string
  title: string | null
  ogImage: string | null
  commentCount: number
  createdAt: string
}
