// 交易详情安全展示所需字段；聚合仅存在于详情，列表不假设摘要存在。
import type { Summary } from "./user";
export interface RefundAttempt {
  id: number;
  refundId: number;
  refundNo: string;
  channelStatus: string;
  createdAt: string;
}
export interface Trade {
  channelStatus?: string | null;
  retryCount?: number;
  lastRetryAt?: string | null;
  attempts?: RefundAttempt[];
  id: number;
  status: number;
  createdAt: string;
  title?: string;
  orderNo?: string;
  refundNo?: string;
  amount?: string;
  displayPrice?: string;
  serviceFee?: string;
  applyAmount?: string;
  finalAmount?: string | null;
  reason?: string;
  platformReason?: string | null;
  platformDecision?: string | null;
  sourceType?: string | number;
  sourceId?: number;
  publisherId?: number;
  employerId?: number;
  providerId?: number;
  applicantId?: number;
  categoryId?: number;
  deliveryType?: string;
  description?: string;
  addressDetail?: string;
  regionCode?: string;
  paidAt?: string | null;
  completedAt?: string | null;
  appointmentAt?: string | null;
  appointmentEndAt?: string | null;
  depositAmount?: string | null;
  refundedAmount?: string;
  employer?: Summary;
  provider?: Summary;
  settlement?: {
    status: number;
    amount: string;
    serviceFee: string;
    settledAt: string | null;
  } | null;
  refunds?: Trade[];
  source?: { type: string; id: number; orderNo?: string; amount?: string; title?: string } | null;
}
