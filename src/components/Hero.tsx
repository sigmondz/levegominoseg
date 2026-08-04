import type { Summary } from "../lib/types";
import type { Theme } from "../lib/theme";
import { pmLabel, pmTone, who24h } from "../lib/aqi";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  data: Summary;
  theme: Theme;
  onToggleTheme: () => void;
};

export function Hero({ data, theme, onToggleTheme }: Props) {
  const tone = pmTone(data.mean, data.metric);
  const who = who24h(data.metric);

  return (
    <header className="hero">
      <div className="hero-toolbar">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <h1 className="hero-brand">
        <BrandMark className="hero-brand-mark" />
        <span>Levegőminőség Nagymaroson</span>
      </h1>
      <p className="hero-lead">
        A {data.metric} adatok helyi szenzorból származnak. Az időszak átlaga{" "}
        <strong className={`tone-${tone}`}>
          {data.mean.toFixed(1)}{" "}
          <small>{data.unit}</small>
        </strong>
        {who != null ? (
          <>
            {" "}
            — ez {pmLabel(data.mean, data.metric)} a WHO irányértékhez (
            <strong className="hero-who-threshold">
              {who} <small>{data.unit}</small>
            </strong>
            ) képest.
          </>
        ) : (
          <> — a {data.metric}-re nincs hivatalos WHO irányérték.</>
        )}
      </p>
    </header>
  );
}
