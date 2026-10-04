// HTTP 状态与业务错误码独立保留。
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
