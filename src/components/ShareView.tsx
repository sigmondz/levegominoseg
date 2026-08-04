import { useEffect, useState } from "react";
import { buildSharePreview, copyText } from "../lib/shareView";
import { IconActionButton } from "./IconActionButton";

type Props = {
  fromMs: number;
  toMs: number;
  mean: number;
};

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6.5 9.5a3.2 3.2 0 0 0 4.55.15l1.6-1.6a3.2 3.2 0 0 0-4.53-4.53L7.3 4.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 6.5a3.2 3.2 0 0 0-4.55-.15l-1.6 1.6a3.2 3.2 0 1 0 4.53 4.53L8.7 11.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareView({ fromMs, toMs, mean }: Props) {
  const [copied, setCopied] = useState(false);
  const preview = buildSharePreview(fromMs, toMs, mean);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function handleCopy() {
    try {
      await copyText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <IconActionButton
      label={copied ? "Másolva!" : "Link másolása"}
      tip={
        copied
          ? "A link a vágólapra került."
          : `Link másolása. ${preview}`
      }
      tipId="share-link-tip"
      onClick={() => void handleCopy()}
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
    </IconActionButton>
  );
}
