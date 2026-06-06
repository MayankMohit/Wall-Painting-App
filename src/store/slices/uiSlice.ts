import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  isCheckingAuth: boolean;
}

const initialState: UiState = {
  isCheckingAuth: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCheckingAuth(state, action: PayloadAction<boolean>) {
      state.isCheckingAuth = action.payload;
    },
  },
});

export const { setCheckingAuth } = uiSlice.actions;
export default uiSlice.reducer;
