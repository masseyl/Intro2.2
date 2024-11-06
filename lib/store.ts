import { configureStore } from '@reduxjs/toolkit'
import relationshipsReducer from './slices/relationshipsSlice'

export const store = configureStore({
  reducer: {
    relationships: relationshipsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
