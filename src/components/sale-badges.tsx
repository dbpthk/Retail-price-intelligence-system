type SaleBadgesProps = {
  priceType: string | null;
  isHalfPrice: boolean | null;
  isOnSpecial: boolean | null;
  savings: number | null;
  salePercentage: number | null;
  /** Compact style for card layouts */
  compact?: boolean;
};

/**
 * Renders sale promotion badges from Woolworths API data.
 * Priority: Half Price > Save $X > On Special > X% off
 */
export function SaleBadges({
  priceType,
  isHalfPrice,
  isOnSpecial,
  savings,
  salePercentage,
  compact = false,
}: SaleBadgesProps) {
  if (priceType !== "sale") return null;

  const badges: React.ReactNode[] = [];

  if (isHalfPrice) {
    badges.push(
      <span
        key="half-price"
        className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-400/20 dark:text-amber-300"
      >
        Half Price!
      </span>
    );
  }

  if (savings != null && savings > 0) {
    const savingsStr = `$${savings.toFixed(2)}`;
    badges.push(
      <span
        key="savings"
        className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300"
      >
        Save {savingsStr}
      </span>
    );
  }

  if (isOnSpecial && !isHalfPrice) {
    badges.push(
      <span
        key="on-special"
        className="rounded bg-[#16A34A]/10 px-2 py-0.5 text-xs font-medium text-[#16A34A]"
      >
        On Special
      </span>
    );
  }

  if (salePercentage != null && salePercentage > 0 && !isHalfPrice) {
    badges.push(
      <span
        key="percent"
        className="rounded bg-[#16A34A]/10 px-2 py-0.5 text-xs font-medium text-[#16A34A]"
      >
        {salePercentage}% off
      </span>
    );
  }

  if (badges.length === 0 && priceType === "sale") {
    badges.push(
      <span
        key="sale"
        className="rounded bg-[#16A34A]/10 px-2 py-0.5 text-xs font-medium text-[#16A34A]"
      >
        Sale
      </span>
    );
  }

  return (
    <span className={compact ? "inline-flex flex-wrap gap-1" : "flex flex-wrap gap-1.5"}>
      {badges}
    </span>
  );
}
