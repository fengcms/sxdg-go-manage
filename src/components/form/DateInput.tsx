// 中文日期入口保留原生日历能力，表单值仍为后端约定的年月日字符串。
import { CalendarDays } from "lucide-react";
import { useRef } from "react";
import { Input } from "../ui";
export function DateInput({
  id,
  value,
  change,
}: {
  id: string;
  value: string;
  change: (v: string) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  return (
    <div className="date-input">
      <Input
        id={id}
        value={value}
        placeholder="年-月-日"
        pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
        title="日期格式：2026-10-04"
        onChange={(e) => change(e.target.value)}
      />
      <input
        ref={picker}
        type="date"
        className="native-date-picker"
        tabIndex={-1}
        aria-hidden="true"
        value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
        onChange={(e) => change(e.target.value)}
      />
      <button
        type="button"
        aria-label="打开日期选择器"
        className="date-trigger"
        onClick={() => {
          if (picker.current?.showPicker) picker.current.showPicker();
          else picker.current?.focus();
        }}
      >
        <CalendarDays size={16} />
      </button>
    </div>
  );
}
