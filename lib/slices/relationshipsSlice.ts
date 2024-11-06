import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Relationship {
  id: string
  contactName: string
  emailCount: number
  lastInteraction: string
}

interface RelationshipsState {
  data: Relationship[]
  loading: boolean
  error: string | null
}

const initialState: RelationshipsState = {
  data: [],
  loading: false,
  error: null,
}

const relationshipsSlice = createSlice({
  name: 'relationships',
  initialState,
  reducers: {
    setRelationships: (state, action: PayloadAction<Relationship[]>) => {
      state.data = action.payload
      state.loading = false
      state.error = null
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.loading = false
    },
  },
})

export const { setRelationships, setLoading, setError } = relationshipsSlice.actions

export default relationshipsSlice.reducer
