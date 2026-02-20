'use client'

import { useState } from 'react'
import type { CommentNode } from '@/types'
import CommentNodeComponent from './CommentNode'

const PAGE_SIZE = 20

interface Props {
  comments: CommentNode[]
  threadId: string
  currentUserId?: string | null
}

export default function CommentTree({ comments, threadId, currentUserId }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Focus stack: each "continue thread" click pushes a comment onto the stack.
  // The current view shows the focused comment's children as the new root.
  // "back" pops the stack.
  const [focusStack, setFocusStack] = useState<CommentNode[]>([])

  const focused = focusStack[focusStack.length - 1] ?? null

  function handleFocus(comment: CommentNode) {
    setFocusStack(prev => [...prev, comment])
    setVisibleCount(PAGE_SIZE) // reset pagination for the new view
  }

  function handleBack() {
    setFocusStack(prev => prev.slice(0, -1))
    setVisibleCount(PAGE_SIZE)
  }

  // In focused mode: render the focused comment's children as root level.
  // In normal mode: render all top-level comments with pagination.
  const displayComments = focused ? focused.children : comments
  const visibleComments = displayComments.slice(0, visibleCount)
  const remaining = displayComments.length - visibleCount

  if (comments.length === 0) {
    return (
      <p style={{ color: '#888', fontSize: '13px', marginTop: '24px', textAlign: 'center' }}>
        No comments yet. Be the first.
      </p>
    )
  }

  return (
    <div style={{ marginTop: '8px' }}>

      {/* ── Focus breadcrumb ───────────────────────────────── */}
      {focused && (
        <div style={{
          borderLeft: '3px solid #1a5276',
          paddingLeft: '10px',
          marginBottom: '12px',
          background: '#f6f8fa',
          padding: '8px 12px',
        }}>
          {/* Back button */}
          <button
            onClick={handleBack}
            style={{
              background: 'none', border: 'none', color: '#1a5276',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
              padding: 0, marginBottom: '4px', display: 'block',
            }}
          >
            ← back
          </button>

          {/* Context: which comment are we inside */}
          <div style={{ fontSize: '11px', color: '#888' }}>
            viewing replies to{' '}
            <span style={{ color: '#1a5276', fontWeight: 700 }}>
              {focused.isDeleted ? '[deleted]' : (focused.user?.username ?? '[unknown]')}
            </span>
            {focused.content && !focused.isDeleted && (
              <span style={{ color: '#555' }}>
                {' '}· &quot;
                {focused.content.length > 80
                  ? focused.content.slice(0, 80) + '…'
                  : focused.content}
                &quot;
              </span>
            )}
          </div>

          {/* Breadcrumb trail if nested focus */}
          {focusStack.length > 1 && (
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
              {focusStack.map((c, i) => (
                <span key={c.id}>
                  <button
                    onClick={() => setFocusStack(prev => prev.slice(0, i + 1))}
                    style={{ background: 'none', border: 'none', color: i === focusStack.length - 1 ? '#888' : '#1a5276', cursor: i === focusStack.length - 1 ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '11px', padding: 0 }}
                  >
                    {c.isDeleted ? '[deleted]' : (c.user?.username ?? '[unknown]')}
                  </button>
                  {i < focusStack.length - 1 && <span style={{ margin: '0 4px', color: '#ccc' }}>›</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Comment list ───────────────────────────────────── */}
      {visibleComments.length === 0 ? (
        <p style={{ color: '#888', fontSize: '13px', padding: '12px 0' }}>
          No replies yet.
        </p>
      ) : (
        visibleComments.map(comment => (
          <CommentNodeComponent
            key={comment.id}
            comment={comment}
            threadId={threadId}
            currentUserId={currentUserId}
            // In focused mode, normalize depth so the first visible comment reads as depth 0
            rootDepth={focused ? focused.depth + 1 : 0}
            onFocus={handleFocus}
          />
        ))
      )}

      {/* ── Load more ──────────────────────────────────────── */}
      {remaining > 0 && (
        <button
          onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          style={{
            display: 'block', width: '100%', marginTop: '16px',
            padding: '10px', background: '#f6f6f6', border: '1px solid #ccc',
            color: '#1a5276', fontSize: '13px', fontFamily: 'inherit',
            cursor: 'pointer', textAlign: 'center',
          }}
        >
          load more comments ({remaining} remaining)
        </button>
      )}
    </div>
  )
}
