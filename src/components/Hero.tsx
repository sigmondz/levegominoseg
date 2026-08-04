import type { Summary } from "../lib/types";
import type { Theme } from "../lib/theme";
import { toDateInputValue } from "../lib/aggregate";
import { pmLabel, pmTone, WHO_24H } from "../lib/aqi";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  data: Summary;
  dataFromMs: number;
  dataToMs: number;
  theme: Theme;
  onToggleTheme: () => void;
};

export function Hero({
  data,
  dataFromMs,
  dataToMs,
  theme,
  onToggleTheme,
}: Props) {
  const tone = pmTone(data.mean);
  const rangeLabel = `${toDateInputValue(dataFromMs)} → ${toDateInputValue(dataToMs)}`;

  return (
    <header className="hero">
      <div className="hero-toolbar">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <h1 className="hero-brand">Levegőminőség Nagymaroson</h1>
      <div className="hero-meta">
        <span>
          {data.sensor} · {data.metric}
        </span>
        <span>{rangeLabel}</span>
        <span>{data.chipId}</span>
      </div>
      <p className="hero-lead">
        PM2.5 a helyi SPS30 szenzorból. A kiválasztott időszak átlaga{" "}
        <strong className={`tone-${tone}`}>
          {data.mean.toFixed(1)} {data.unit}
        </strong>{" "}
        — {pmLabel(data.mean)} tartomány a WHO 24 órás irányértékhez ({WHO_24H}{" "}
        {data.unit}) képest.
      </p>
    </header>
  );
}
