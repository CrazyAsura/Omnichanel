import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "super-admin" | "admin" | "funcionario";

interface SessionState {
  email: string;
  name: string;
  role: UserRole;
  authenticated: boolean;
}

const initialState: SessionState = {
  email: "marina.costa@exemplo.com",
  name: "Marina Costa",
  role: "super-admin",
  authenticated: true,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setEmail(state, action: PayloadAction<string>) {
      state.email = action.payload;
    },
    setRole(state, action: PayloadAction<UserRole>) {
      state.role = action.payload;
    },
    setSession(
      state,
      action: PayloadAction<{ email: string; name?: string; role: UserRole }>
    ) {
      state.email = action.payload.email;
      if (action.payload.name) state.name = action.payload.name;
      state.role = action.payload.role;
      state.authenticated = true;
    },
    signOut(state) {
      state.authenticated = false;
    },
  },
});

export const { setEmail, setRole, setSession, signOut } = sessionSlice.actions;
export const store = configureStore({ reducer: { session: sessionSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

