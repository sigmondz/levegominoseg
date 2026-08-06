import type { MaxWindow, TrendGrain } from "../lib/types";

export type GrainCopy = {
  title: string;
  desc: string;
  seriesTitle: string;
  seriesDesc: string;
  maxDesc?: string;
};

export const GRAIN_OPTIONS: { id: TrendGrain; label: string }[] = [
  { id: "raw", label: "3 perc" },
  { id: "6m", label: "6 perc" },
  { id: "15m", label: "15 perc" },
  { id: "30m", label: "30 perc" },
  { id: "hour", label: "1 óra" },
  { id: "2h", label: "2 óra" },
  { id: "4h", label: "4 óra" },
  { id: "8h", label: "8 óra" },
  { id: "12h", label: "12 óra" },
  { id: "day", label: "Nap" },
  { id: "2d", label: "2 nap" },
  { id: "week", label: "Hét" },
];

export const MAX_WINDOW_OPTIONS: { id: MaxWindow; label: string }[] = [
  { id: "3m", label: "3 perc" },
  { id: "6m", label: "6 perc" },
  { id: "15m", label: "15 perc" },
  { id: "30m", label: "30 perc" },
  { id: "hour", label: "1 óra" },
  { id: "2h", label: "2 óra" },
  { id: "6h", label: "6 óra" },
  { id: "12h", label: "12 óra" },
  { id: "day", label: "Nap" },
];

function maxWindowLabel(window: MaxWindow, intervalMin: number): string {
  switch (window) {
    case "3m":
      return `${intervalMin} perces`;
    case "6m":
      return "6 perces";
    case "15m":
      return "15 perces";
    case "30m":
      return "30 perces";
    case "hour":
      return "1 órás";
    case "2h":
      return "2 órás";
    case "6h":
      return "6 órás";
    case "12h":
      return "12 órás";
    case "day":
      return "napi";
  }
}

type BucketCopy = {
  title: string;
  desc: (intervalMin: number) => string;
  seriesDesc: (intervalMin: number) => string;
  /** e.g. "nap" / "két nap" / "hét" — used in max tip */
  bucket: string;
  /** e.g. "napon belüli" / "két napon belüli" / "héten belüli" */
  bucketInside: string;
};

const BUCKET_COPY: Partial<Record<TrendGrain, BucketCopy>> = {
  day: {
    title: "Napi átlag és csúcs",
    bucket: "nap",
    bucketInside: "napon belüli",
    desc: (intervalMin) =>
      `Minden nap a ${intervalMin} perces átlagértékekből számolva. A szaggatott vonalak a referencia-határértékek.`,
    seriesDesc: (intervalMin) =>
      `Az adott nap összes érvényes ${intervalMin} perces mintájának számtani átlaga. A napi tipikus PM2.5-szintet mutatja: a rövid kiugrások kevésbé húzzák el, mint a nyers görbén. Így napokat hasonlíthatsz össze, és látod, általában milyen volt a terhelés. A grafikonon a folyamatos (nem szaggatott) görbe.`,
  },
  "2d": {
    title: "Kétnapos átlag és csúcs",
    bucket: "két nap",
    bucketInside: "két napon belüli",
    desc: (intervalMin) =>
      `Minden kétnapos blokk a ${intervalMin} perces átlagértékekből számolva. A szaggatott vonalak a referencia-határértékek.`,
    seriesDesc: (intervalMin) =>
      `Az adott két nap összes érvényes ${intervalMin} perces mintájának számtani átlaga. Sűrűbb, mint a heti nézet, de simább, mint a napi — negyedéves és féléves tartományokban jól követhető. A grafikonon a folyamatos (nem szaggatott) görbe.`,
  },
  week: {
    title: "Heti átlag és csúcs",
    bucket: "hét",
    bucketInside: "héten belüli",
    desc: (intervalMin) =>
      `Minden hét (hétfőtől vasárnapig) a ${intervalMin} perces átlagértékekből számolva. A szaggatott vonalak a referencia-határértékek.`,
    seriesDesc: (intervalMin) =>
      `Az adott hét összes érvényes ${intervalMin} perces mintájának számtani átlaga. A heti tipikus PM2.5-szintet mutatja: a rövid kiugrások és a napi zaj kevésbé húzzák el. Negyedéves vagy féléves nézetben így jól összehasonlíthatók a hetek. A grafikonon a folyamatos (nem szaggatott) görbe.`,
  },
};

const SHORT_GRAIN_UI: Partial<
  Record<TrendGrain, { titlePrefix: string; windowLabel: string }>
> = {
  hour: { titlePrefix: "Óránkénti", windowLabel: "1 órában" },
  "2h": { titlePrefix: "2 órás", windowLabel: "2 órában" },
  "4h": { titlePrefix: "4 órás", windowLabel: "4 órában" },
  "8h": { titlePrefix: "8 órás", windowLabel: "8 órában" },
  "12h": { titlePrefix: "12 órás", windowLabel: "12 órában" },
  "6m": { titlePrefix: "6 perces", windowLabel: "6 percben" },
  "15m": { titlePrefix: "15 perces", windowLabel: "15 percben" },
  "30m": { titlePrefix: "30 perces", windowLabel: "30 percben" },
};

function maxDescForBucket(
  intervalMin: number,
  maxLabel: string,
  maxIsRaw: boolean,
  bucket: string,
  bucketInside: string,
): string {
  if (maxIsRaw) {
    return `Az adott ${bucket} legmagasabb ${intervalMin} perces mérése — a csúcsterhelést emeli ki. A max ablak „${intervalMin} perc” beállításánál ez a nyers csúcs. A grafikonon a piros görbe.`;
  }
  return `Az adott ${bucketInside}, ${maxLabel} ablakokra számolt átlagok közül a legmagasabb. A rövid kiugrásokat simítja, a tartósabb csúcsokat megőrzi. A max ablakot fent állíthatod. A grafikonon a piros görbe.`;
}

export function grainCopy(
  grain: TrendGrain,
  intervalMin: number,
  maxWindow: MaxWindow,
): GrainCopy {
  const maxLabel = maxWindowLabel(maxWindow, intervalMin);
  const maxIsRaw = maxWindow === "3m";

  if (grain === "raw") {
    return {
      title: `${intervalMin} perces mérések`,
      desc: `A szenzor ${intervalMin} percenkénti mintái aggregálás nélkül. A szaggatott vonalak a referencia-határértékek.`,
      seriesTitle: "Mért érték (görbe)",
      seriesDesc: `Minden pont egyetlen ${intervalMin} perces szenzorolvasás, aggregálás és simítás nélkül. Így látszik a tényleges időbeli változás: a rövid kiugrások és a csendesebb szakaszok is. Hasznos, ha a pillanatnyi terhelést akarod követni, nem a hosszabb időszaki tipikus szintet. A grafikonon a folyamatos (nem szaggatott) görbe.`,
    };
  }

  const bucket = BUCKET_COPY[grain];
  if (bucket) {
    return {
      title: bucket.title,
      desc: bucket.desc(intervalMin),
      seriesTitle: "Átlag görbe",
      seriesDesc: bucket.seriesDesc(intervalMin),
      maxDesc: maxDescForBucket(
        intervalMin,
        maxLabel,
        maxIsRaw,
        bucket.bucket,
        bucket.bucketInside,
      ),
    };
  }

  const short = SHORT_GRAIN_UI[grain] ?? {
    titlePrefix: "30 perces",
    windowLabel: "30 percben",
  };
  const { titlePrefix, windowLabel } = short;

  return {
    title: `${titlePrefix} átlag és csúcs`,
    desc: `A kiválasztott tartomány ${titlePrefix.toLowerCase()} átlag- és maximumértékei a ${intervalMin} perces mintákból.`,
    seriesTitle: "Átlag görbe",
    seriesDesc: `Az adott ${windowLabel} mért, érvényes ${intervalMin} perces minták számtani átlaga. A tipikus terhelést mutatja ebben az időablakban: a rövid zaj kevésbé látszik, mint a nyers görbén. Így követheted, hogyan alakult a PM2.5 a választott adatsűrűség szerint. A grafikonon a folyamatos (nem szaggatott) görbe.`,
    maxDesc: maxIsRaw
      ? `Az adott ${windowLabel} mért legmagasabb ${intervalMin} perces érték — a rövid csúcsokat emeli ki. Ha egy erős, rövid szennyezési hullám volt, itt jelenik meg, még ha az átlagot alig emelte is. A max ablak „${intervalMin} perc” beállításánál ez a nyers csúcs. A grafikonon a piros görbe.`
      : `Az adott ${windowLabel} belüli, ${maxLabel} ablakokra számolt átlagok közül a legmagasabb. A rövid, egyedi kiugrásokat simítja, de a tartósabb csúcsokat megőrzi — ezért kevésbé „zajérzékeny”, mint a nyers max. A max ablakot fent állíthatod. A grafikonon a piros görbe.`,
  };
}
