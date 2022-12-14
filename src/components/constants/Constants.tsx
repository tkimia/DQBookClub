export const CONTEST_STATUS = [
  "open",
  "voting",
  "closed",
  "past",
] as const

export type ContestStatus = typeof CONTEST_STATUS[number]

export const RANKS = [
  "gold",
  "silver",
  "bronze"
] as const

export const RANK_COLORS: Record<Rank, string> = {
  gold: '#FFD700',
  silver: '#AFAFAF',
  bronze: '#CD7F32'
}

export type Rank = typeof RANKS[number]

export type Contest = {
  status: ContestStatus
  name: string
  id: string
}

export type Submission = {
  imageUrl: string
  id: string // sumission ID === submitting user's ID
}

export type Vote = {
  id: string
  rank: Rank
  submissionId: string
  userId: string
}