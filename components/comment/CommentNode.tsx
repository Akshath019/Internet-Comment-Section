'use client'

import { useState } from 'react'
import type { CommentNode as CommentNodeType } from '@/types'
import VoteButtons from './VoteButtons'
import CommentForm from './CommentForm'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

const INITIAL_REPLIES = 3  // direct replies shown before "+ more" button
const MAX_DEPTH_STEP = 8   // visual depth steps before "continue thread" kicks in

interface Props {
  comment: CommentNodeType
  threadId: string
  currentUserId?: string | null
  rootDepth?: number                            // depth of the topmost visible comment (for focus mode)
  onFocus?: (comment: CommentNodeType) => void  // called when user clicks "continue thread"
}

export default function CommentNode({
  comment,
  threadId,
  currentUserId,
  rootDepth = 0,
  onFocus,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content ?? '')
  const [localContent, setLocalContent] = useState(comment.content)
  const [editError, setEditError] = useState('')
  const [showAllReplies, setShowAllReplies] = useState(false)

  const isDeleted = comment.isDeleted

  // Depth relative to the current view root (0 = top of what's visible)
  const relativeDepth = comment.depth - rootDepth
  const isRoot = relativeDepth === 0

  const displayUser = isDeleted ? '[deleted]' : (comment.user?.username ?? '[unknown]')
  const displayContent = isDeleted ? '[deleted]' : localContent

  const visibleChildren = showAllReplies
    ? comment.children
    : comment.children.slice(0, INITIAL_REPLIES)
  const hiddenCount = comment.children.length - visibleChildren.length
  const totalReplies = countReplies(comment)

  // At this relative depth, stop nesting — show "continue thread" instead
  const atDepthLimit = relativeDepth >= MAX_DEPTH_STEP

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editContent.trim()) return
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    })
    if (res.ok) {
      setLocalContent(editContent.trim())
      setEditing(false)
      setEditError('')
    } else {
      const d = await res.json()
      setEditError(d.error ?? 'Failed to edit')
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this comment?')) return
    await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' })
    setLocalContent(null)
    setEditing(false)
  }

  return (
    <div style={{ marginTop: isRoot ? '12px' : '6px' }}>

      {/* ── Header row ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'expand' : 'collapse'}
          style={{
            flexShrink: 0, width: '15px', height: '15px', marginTop: '1px',
            background: 'none', border: '1px solid #ccc', color: '#888',
            fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit',
            padding: 0, lineHeight: 1, textAlign: 'center',
          }}
        >
          {collapsed ? '+' : '−'}
        </button>

        {/* Right of toggle */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Meta: votes · username · timestamp · [collapsed count] */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {!isDeleted && (
              <VoteButtons
                commentId={comment.id}
                upvotes={comment.upvotes}
                downvotes={comment.downvotes}
                userVote={comment.userVote}
                currentUserId={currentUserId}
              />
            )}

            {isDeleted ? (
              <span style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>[deleted]</span>
            ) : (
              <Link
                href={`/u/${comment.user?.username ?? ''}`}
                style={{ fontSize: '12px', color: '#1a5276', fontWeight: 700, textDecoration: 'none' }}
              >
                {displayUser}
              </Link>
            )}

            <span style={{ color: '#ddd', fontSize: '11px' }}>•</span>

            <span
              title={new Date(comment.createdAt).toISOString()}
              style={{ fontSize: '11px', color: '#888', cursor: 'default' }}
            >
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>

            {collapsed && totalReplies > 0 && (
              <span style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                [{totalReplies} hidden {totalReplies === 1 ? 'reply' : 'replies'}]
              </span>
            )}
          </div>

          {/* ── Body ──────────────────────────────────────────── */}
          {!collapsed && (
            <>
              {editing ? (
                <form onSubmit={submitEdit} style={{ marginTop: '4px' }}>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%', border: '1px solid #ccc', padding: '6px 8px',
                      fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '12px' }}>
                    <button type="submit" style={{ background: '#1a5276', color: '#fff', border: 'none', padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      save
                    </button>
                    <button type="button" onClick={() => setEditing(false)} style={{ background: 'none', border: '1px solid #ccc', padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', color: '#888' }}>
                      cancel
                    </button>
                    {editError && <span style={{ color: '#c0392b' }}>{editError}</span>}
                  </div>
                </form>
              ) : (
                <p style={{
                  fontSize: '13px', lineHeight: 1.5, margin: '4px 0',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  color: isDeleted ? '#aaa' : '#222',
                  fontStyle: isDeleted ? 'italic' : 'normal',
                }}>
                  {displayContent}
                </p>
              )}

              {/* Action bar */}
              {!isDeleted && !editing && (
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#888' }}>
                  <button onClick={() => setReplying(!replying)} style={actionBtn}>[reply]</button>
                  {currentUserId && currentUserId === comment.userId && (
                    <>
                      <button onClick={() => setEditing(true)} style={actionBtn}>[edit]</button>
                      <button onClick={handleDelete} style={{ ...actionBtn, color: '#c0392b' }}>[delete]</button>
                    </>
                  )}
                </div>
              )}

              {replying && (
                <div style={{ marginTop: '8px' }}>
                  <CommentForm
                    threadId={threadId}
                    parentId={comment.id}
                    currentUserId={currentUserId}
                    onSuccess={() => setReplying(false)}
                    placeholder={`Replying to ${displayUser}...`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Children ─────────────────────────────────────────── */}
      {!collapsed && comment.children.length > 0 && (
        <div style={{
          marginLeft: '7px',
          paddingLeft: '16px',
          borderLeft: '2px solid #e8e8e8',
        }}>

          {/* Depth limit: hide children, show "continue thread" */}
          {atDepthLimit ? (
            <button
              onClick={() => onFocus?.(comment)}
              style={{
                display: 'block',
                marginTop: '6px',
                background: 'none',
                border: 'none',
                color: '#1a5276',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '4px 0',
                textAlign: 'left',
              }}
            >
              ↪ continue this thread ({comment.children.length} more{' '}
              {comment.children.length === 1 ? 'reply' : 'replies'}) →
            </button>
          ) : (
            <>
              {visibleChildren.map(child => (
                <CommentNode
                  key={child.id}
                  comment={child}
                  threadId={threadId}
                  currentUserId={currentUserId}
                  rootDepth={rootDepth}
                  onFocus={onFocus}
                />
              ))}

              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowAllReplies(true)}
                  style={{
                    display: 'block', marginTop: '6px',
                    background: 'none', border: '1px solid #ccc',
                    color: '#1a5276', fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'inherit', padding: '3px 10px',
                  }}
                >
                  + {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

const actionBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#888',
  cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', padding: 0,
}

function countReplies(node: CommentNodeType): number {
  return node.children.reduce((acc, c) => acc + 1 + countReplies(c), 0)
}
