import { create } from 'zustand'

export interface Relationship {
  id: string
  contactName: string
  emailCount: number
  lastInteraction: string
}

interface RelationshipsState {
  data: Relationship[]
  loading: boolean
  error: string | null
  nodes: any[];
  edges: any[];
  fetchGraphData: () => Promise<void>;
  setRelationships: (relationships: Relationship[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchRelationships: () => Promise<void>
  createRelationship: (relationship: Relationship) => Promise<void>
}

export const useRelationshipsStore = create<RelationshipsState>((set) => ({
  data: [],
  loading: false,
  error: null,
  nodes: [],
  edges: [],
  fetchGraphData: async () => {
    const response = await fetch('/api/graph');
    const data = await response.json();
    set({ nodes: data.nodes, edges: data.edges });
  },
  setRelationships: (relationships) => set({ 
    data: relationships, 
    loading: false, 
    error: null 
  }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ 
    error, 
    loading: false 
  }),
  fetchRelationships: async () => {
    set({ loading: true })
    try {
      const response = await fetch('/api/relationships')
      if (!response.ok) throw new Error('Failed to fetch relationships')
      const relationships = await response.json()
      set({ data: relationships, error: null })
    } catch (error: any) {
      set({ error: error.message })
    } finally {
      set({ loading: false })
    }
  },
  createRelationship: async (relationship) => {
    try {
      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(relationship),
      })
      if (!response.ok) throw new Error('Failed to create relationship')
      const result = await response.json()
      // Fetch updated relationships
      const { fetchRelationships } = useRelationshipsStore.getState()
      await fetchRelationships()
    } catch (error: any) {
      set({ error: error.message })
    }
  }
}))
