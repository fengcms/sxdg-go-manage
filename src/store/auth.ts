// 令牌只驻留内存，epoch 隔离退出前的所有异步响应。
import { create } from "zustand";
import type { Tokens, UserIdentity } from "../types/common";

interface Auth {
  tokens: Tokens | null;
  user: UserIdentity | null;
  epoch: number;
  set: (tokens: Tokens, user: UserIdentity) => void;
  rotate: (tokens: Tokens) => void;
  identity: (user: UserIdentity) => void;
  clear: () => void;
}
export const useAuth = create<Auth>((set) => ({
  tokens: null,
  user: null,
  epoch: 0,
  set: (tokens, user) => set((s) => ({ tokens, user, epoch: s.epoch + 1 })),
  rotate: (tokens) => set({ tokens }),
  identity: (user) => set({ user }),
  clear: () => set((s) => ({ tokens: null, user: null, epoch: s.epoch + 1 })),
}));
