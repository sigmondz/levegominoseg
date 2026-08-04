import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type Props = {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
};

const WEEKDAYS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

const MONTHS = [
  "január",
  "február",
  "március",
  "április",
  "május",
  "június",
  "július",
  "augusztus",
  "szeptember",
  "október",
  "november",
  "december",
];

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toYmd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplay(value: string): string {
  const date = parseYmd(value);
  if (!date) return "Válassz dátumot";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}.`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function clampMonth(view: Date, min?: string, max?: string): Date {
  let next = startOfMonth(view);
  const minDate = min ? parseYmd(min) : null;
  const maxDate = max ? parseYmd(max) : null;
  if (minDate && next < startOfMonth(minDate)) next = startOfMonth(minDate);
  if (maxDate && next > startOfMonth(maxDate)) next = startOfMonth(maxDate);
  return next;
}

function isDisabled(ymd: string, min?: string, max?: string): boolean {
  if (min && ymd < min) return true;
  if (max && ymd > max) return true;
  return false;
}

export function DatePicker({ label, value, min, max, onChange }: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const [view, setView] = useState(() =>
    clampMonth(selected ?? parseYmd(max ?? min ?? "") ?? new Date(), min, max),
  );

  useEffect(() => {
    if (!open) return;
    setView(
      clampMonth(
        parseYmd(value) ?? parseYmd(max ?? min ?? "") ?? new Date(),
        min,
        max,
      ),
    );
  }, [open, value, min, max]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cells = useMemo(() => {
    const first = startOfMonth(view);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const ymd = toYmd(date);
      return {
        ymd,
        day: date.getDate(),
        inMonth: date.getMonth() === view.getMonth(),
        disabled: isDisabled(ymd, min, max),
        selected: ymd === value,
      };
    });
  }, [view, min, max, value]);

  const canPrev = !min || toYmd(addMonths(view, -1)) >= min.slice(0, 8) + "01";
  const canNext = !max || toYmd(addMonths(view, 1)) <= max;

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div className={`date-picker${open ? " is-open" : ""}`} ref={rootRef}>
      <span className="date-picker-label" id={id}>
        {label}
      </span>
      <button
        type="button"
        className={`date-picker-trigger${open ? " is-open" : ""}`}
        aria-labelledby={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
      >
        <span>{formatDisplay(value)}</span>
        <svg
          className="date-picker-icon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="3.5"
            y="5.5"
            width="17"
            height="15"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M3.5 9.5h17M8 3.5v4M16 3.5v4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          className="date-picker-popover"
          role="dialog"
          aria-modal="false"
          aria-label={`${label} naptár`}
        >
          <div className="date-picker-header">
            <button
              type="button"
              className="date-picker-nav"
              aria-label="Előző hónap"
              disabled={!canPrev}
              onClick={() => setView((current) => addMonths(current, -1))}
            >
              ‹
            </button>
            <p className="date-picker-month">
              {view.getFullYear()}. {MONTHS[view.getMonth()]}
            </p>
            <button
              type="button"
              className="date-picker-nav"
              aria-label="Következő hónap"
              disabled={!canNext}
              onClick={() => setView((current) => addMonths(current, 1))}
            >
              ›
            </button>
          </div>

          <div className="date-picker-weekdays" aria-hidden="true">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="date-picker-grid" role="grid">
            {cells.map((cell) => (
              <button
                key={cell.ymd}
                type="button"
                role="gridcell"
                className={[
                  "date-picker-day",
                  cell.inMonth ? "" : "is-outside",
                  cell.selected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={cell.disabled}
                aria-selected={cell.selected}
                onClick={() => {
                  onChange(cell.ymd);
                  setOpen(false);
                }}
              >
                {cell.day}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
