// Wilson score lower bound — Reddit's "Best" sort algorithm
// Uses 80% confidence interval (z = 1.281551565545), same as Reddit
export function wilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes
  if (n === 0) return 0

  const z = 1.281551565545
  const p = upvotes / n
  const left = p + (z * z) / (2 * n)
  const right = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)
  const under = 1 + (z * z) / n

  return (left - right) / under
}

// Controversial: high total votes but close to 50/50 split
export function controversialScore(upvotes: number, downvotes: number): number {
  if (upvotes <= 0 || downvotes <= 0) return 0
  const magnitude = upvotes + downvotes
  const balance = upvotes > downvotes ? downvotes / upvotes : upvotes / downvotes
  return magnitude ** balance
}
