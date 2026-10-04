// 用户与资质只声明后端可公开给管理端的字段。
export interface Summary {
  id: number;
  nickname: string;
  avatarUrl: string | null;
}
export interface User extends Summary {
  isAdmin: boolean;
  adminRole: string | null;
  isEmployer: boolean;
  isProvider: boolean;
  creditScore: number;
  createdAt: string;
  lastLoginAt: string | null;
  banned?: boolean;
  banReason: string | null;
  bannedAt: string | null;
  phoneMasked?: string | null;
  completedOrders?: number;
}
export interface Qualification {
  id: number;
  userId: number;
  certType: string;
  certNo: string | null;
  imageUrls: string[];
  status: number;
  rejectReason: string | null;
  createdAt: string;
  user?: Summary;
}
