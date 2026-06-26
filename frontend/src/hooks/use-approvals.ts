import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approvalRepository } from '@/lib/db/repositories/approval-repository'
import {
  getHistoryRecords,
  getInboxRecords,
  startApproval,
  transitionApproval,
  type StartApprovalParams,
} from '@/lib/workflow/workflow-service'

export function useApprovalInbox() {
  return useQuery({
    queryKey: ['approvals', 'inbox'],
    queryFn: () => getInboxRecords(),
  })
}

export function useApprovalHistory() {
  return useQuery({
    queryKey: ['approvals', 'history'],
    queryFn: () => getHistoryRecords(),
  })
}

export function useApprovalRecord(id: string | null) {
  return useQuery({
    queryKey: ['approval', id],
    queryFn: () => (id ? approvalRepository.getById(id) : Promise.resolve(undefined)),
    enabled: !!id,
  })
}

export function useStartApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: StartApprovalParams) => startApproval(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })
}

export function useTransitionApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      recordId: string
      action: 'approve' | 'reject'
      actor: string
      comment?: string
    }) =>
      transitionApproval(params.recordId, params.action, params.actor, params.comment),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: ['approval', variables.recordId] })
      queryClient.invalidateQueries({ queryKey: ['bom-nodes'] })
      queryClient.invalidateQueries({ queryKey: ['bop-nodes'] })
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
  })
}
