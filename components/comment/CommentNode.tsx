'use client'

import { useState } from 'react'
import type { CommentNode as CommentNodeType } from '@/types'
import VoteButtons from './VoteButtons'
import CommentForm from './CommentForm'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Props {
  comment: CommentNodeType
  threadId: string
  currentUserId?: string | null
}

export default function CommentNode({ comment, threadId, currentUserId }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content ?? '')
  const [localContent, setLocalContent] = useState(comment.content)
  const [editError, setEditError] = useState('')

  const isDeleted = comment.isDeleted
  const displayUser = isDeleted ? '[deleted]' : (comment.user?.username ?? '[unknown]')
  const displayContent = isDeleted ? '[deleted]' : localContent

  const indentPx = Math.min(comment.depth, 9) * 18

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

  const totalReplies = countReplies(comment)

  return (
    <div
      style={{
        marginLeft: comment.depth === 0 ? 0 : `${indentPx}px`,
        borderLeft: comment.depth > 0 ? '2px solid #e0e0e0' : 'none',
        paddingLeft: comment.depth > 0 ? '10px' : 0,
        marginTop: comment.depth === 0 ? '14px' : '8px',
      }}
      className="comment-indent"
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'expand' : 'collapse'}
          style={{
            background: 'none',
            border: '1px solid #ccc',
            color: '#888',
            fontSize: '10px',
            width: '16px',
            height: '16px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {collapsed ? '+' : '−'}
        </button>

        {/* Vote buttons */}
        {!isDeleted && (
          <VoteButtons
            commentId={comment.id}
            upvotes={comment.upvotes}
            downvotes={comment.downvotes}
            userVote={comment.userVote}
            currentUserId={currentUserId}
          />
        )}

        {/* Username */}
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

        <span style={{ color: '#ccc', fontSize: '11px' }}>•</span>

        <span
          title={new Date(comment.createdAt).toISOString()}
          style={{ fontSize: '11px', color: '#888', cursor: 'default' }}
        >
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
        </span>

        {/* Collapsed summary */}
        {collapsed && totalReplies > 0 && (
          <span style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
            [{totalReplies} hidden {totalReplies === 1 ? 'reply' : 'replies'}]
          </span>
        )}
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ marginTop: '4px', paddingLeft: '22px' }}>
          {editing ? (
            <form onSubmit={submitEdit}>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  border: '1px solid #ccc',
                  padding: '6px 8px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '12px' }}>
                <button
                  type="submit"
                  style={{
                    background: '#1a5276',
                    color: '#fff',
                    border: 'none',
                    padding: '3px 10px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  style={{
                    background: 'none',
                    border: '1px solid #ccc',
                    padding: '3px 10px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: '#888',
                  }}
                >
                  cancel
                </button>
                {editError && <span style={{ color: '#c0392b' }}>{editError}</span>}
              </div>
            </form>
          ) : (
            <>
              <p
                style={{
                  fontSize: '13px',
                  lineHeight: 1.5,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: isDeleted ? '#aaa' : '#222',
                  fontStyle: isDeleted ? 'italic' : 'normal',
                }}
              >
                {displayContent}
              </p>

              {/* Action bar */}
              {!isDeleted && (
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '4px',
                    fontSize: '11px',
                    color: '#888',
                  }}
                >
                  <button
                    onClick={() => setReplying(!replying)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '11px',
                      padding: 0,
                    }}
                  >
                    [reply]
                  </button>
                  {currentUserId && currentUserId === comment.userId && (
                    <>
                      <button
                        onClick={() => setEditing(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: '11px',
                          padding: 0,
                        }}
                      >
                        [edit]
                      </button>
                      <button
                        onClick={handleDelete}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#c0392b',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: '11px',
                          padding: 0,
                        }}
                      >
                        [delete]
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Reply form */}
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

          {/* Children */}
          {comment.children.map(child => (
            <CommentNode
              key={child.id}
              comment={child}
              threadId={threadId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function countReplies(node: CommentNodeType): number {
  return node.children.reduce((acc, c) => acc + 1 + countReplies(c), 0)
}
