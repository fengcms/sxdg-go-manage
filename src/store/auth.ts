// 令牌同步标签页存储，身份只从后端恢复；epoch 隔离退出前的异步响应。
import { create } from "zustand";
import { saveTokens } from "../lib/sessionStorage";
import type { Tokens, UserIdentity } from "../types/common";

interface Auth {
  tokens: Tokens | null;
  user: UserIdentity | null;
  epoch: number;
  set: (tokens: Tokens, user: UserIdentity) => void;
  rotate: (tokens: Tokens) => void;
  resume: (tokens: Tokens) => void;
  identity: (user: UserIdentity) => void;
  clear: () => void;
}
export const useAuth = create<Auth>((set) => ({
  tokens: null,
  user: null,
  epoch: 0,
  set: (tokens, user) => {
    saveTokens(tokens);
    set((s) => ({ tokens, user, epoch: s.epoch + 1 }));
  },
  resume: (tokens) => set((s) => ({ tokens, user: null, epoch: s.epoch + 1 })),
  rotate: (tokens) => {
    saveTokens(tokens);
    set({ tokens });
  },
  identity: (user) => set({ user }),
  clear: () => {
    saveTokens(null);
    set((s) => ({ tokens: null, user: null, epoch: s.epoch + 1 }));
  },
}));
