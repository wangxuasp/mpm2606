import { useQuery } from '@tanstack/react-query'
import {
  fetchWorkflowCanvas,
  fetchWorkflowGraph,
  fetchWorkflowJobs,
  fetchWorkflowTemplates,
} from '@/lib/api/workflow-client'

export function useWorkflowTemplates(classification: 0 | 1) {
  return useQuery({
    queryKey: ['workflow', 'templates', classification],
    queryFn: () => fetchWorkflowTemplates(classification),
  })
}

export function useWorkflowGraph(puid: string | null) {
  return useQuery({
    queryKey: ['workflow', 'graph', puid],
    queryFn: () => fetchWorkflowGraph(puid as string),
    enabled: Boolean(puid),
  })
}

export function useWorkflowJobs(state?: string) {
  return useQuery({
    queryKey: ['workflow', 'jobs', state ?? 'ALL'],
    queryFn: () => fetchWorkflowJobs(state),
    refetchInterval: 15000,
  })
}

export function useWorkflowCanvas(jobPuid: string | null) {
  return useQuery({
    queryKey: ['workflow', 'canvas', jobPuid],
    queryFn: () => fetchWorkflowCanvas(jobPuid as string),
    enabled: Boolean(jobPuid),
    refetchInterval: 15000,
  })
}
