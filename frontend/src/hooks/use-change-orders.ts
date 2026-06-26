import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  computeChangeDiff,
  createChangeOrderDraft,
  finalizeChangeOrder,
  getChangeOrders,
  submitChangeOrderApproval,
  type FinalizeChangeOrderData,
} from '@/lib/domain/services/change-order-service'

export function useChangeOrders(filters?: {
  productCode?: string
  dateFrom?: string
  dateTo?: string
}) {
  return useQuery({
    queryKey: ['change-orders', filters],
    queryFn: () => getChangeOrders(filters),
  })
}

export function useCreateChangeOrderDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (collaborationId: string) => createChangeOrderDraft(collaborationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
  })
}

export function useComputeChangeDiff() {
  return useMutation({
    mutationFn: (collaborationId: string) => computeChangeDiff(collaborationId),
  })
}

export function useFinalizeChangeOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FinalizeChangeOrderData }) =>
      finalizeChangeOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
  })
}

export function useSubmitChangeOrderApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, actor }: { id: string; actor: string }) =>
      submitChangeOrderApproval(id, actor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })
}
