// 共享信封和分页类型，业务字段保持后端原名。
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface UserIdentity {
  id: number;
  nickname: string;
  isAdmin: boolean;
  adminRole: string | null;
  avatarUrl?: string;
}
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
export interface LoginResult extends Tokens {
  user: UserIdentity;
}
export type Query = Record<string, string | number | boolean | undefined | null>;
