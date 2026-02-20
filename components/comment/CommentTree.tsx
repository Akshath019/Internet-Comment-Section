'use client'

import type { CommentNode } from '@/types'
import CommentNodeComponent from './CommentNode'

interface Props {
  comments: CommentNode[]
  threadId: string
  currentUserId?: string | null
}

export default function CommentTree({ comments, threadId, currentUserId }: Props) {
  if (comments.length === 0) {
    return (
      <p style={{ color: '#888', fontSize: '13px', marginTop: '24px', textAlign: 'center' }}>
        No comments yet. Be the first.
      </p>
    )
  }

  return (
    <div style={{ marginTop: '8px' }}>
      {comments.map(comment => (
        <CommentNodeComponent
          key={comment.id}
          comment={comment}
          threadId={threadId}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}
