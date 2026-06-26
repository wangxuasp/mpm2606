export interface CollaborationLink {
  id: string
  name: string
  ebomRootId: string
  mbomRootId: string | null
  bopRootId: string | null
  owner: string
  createdAt: string
}
