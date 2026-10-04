// 所有表单控件共用标签、帮助信息与错误布局。
import type { ReactNode } from "react";
export function FormField({
  label,
  id,
  error,
  description,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div>
        {children}
        {description && <p className="hint">{description}</p>}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
