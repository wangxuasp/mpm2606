export interface Envelope {
  id: string
  direction: 'in' | 'out'
  subject: string
  from: string
  to: string
  body: string
  refObjectId: string
  createdAt: string
}
