import React from "react";
import  DemoAddCompetitorModal  from "./AddCompetitorModal";

/**
 * CompetitorInsightsEmptyState
 * Drop-in empty state for the Competitor Insights panel.
 *
 * Props:
 * - allowedSeats?: number   // plan's seat allowance (used to show plan line). Default 3.
 * - mode?: 'empty'|'locked' // force a variant; if omitted, computed by (allowedSeats <= 0) → 'locked'
 * - planName?: string       // optional plan label (e.g., "Free", "Trial")
 * - onAdd?: () => void      // called when user clicks "Add Competitor"
 * - onLearnMore?: () => void// called when "Learn More" is clicked
 * - onUpgrade?: () => void  // called when "Upgrade Plan" is clicked (locked mode)
 * - className?: string      // optional wrapper classes
 *
 * Usage:
 *   <CompetitorInsightsEmptyState
 *      allowedSeats={3}
 *      onAdd={() => openAddCompetitorModal()}
 *      onLearnMore={() => openHelp('competitor-insights')}
 *      onUpgrade={() => openBillingModal()}
 *   />
 *
 *   // Locked example (no seats):
 *   <CompetitorInsightsEmptyState
 *      allowedSeats={0}
 *      planName="Free"
 *      onLearnMore={() => openHelp('competitor-insights')}
 *      onUpgrade={() => openBillingModal()}
 *   />
 */
export default function CompetitorInsightsEmptyState({
  allowedSeats = 3,
  mode: forcedMode,
  planName = "",
  onAdd = () => {},
  onLearnMore = () => {},
  onUpgrade = () => {},
  className = "",
}) {
  const isLocked = forcedMode
    ? forcedMode === "locked"
    : Number(allowedSeats) <= 0;

  const primaryBtn =
    "inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#1090D0] text-white font-medium hover:bg-[#0B79AD] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1090D0] transition";
  const ghostLink =
    "inline-flex items-center font-medium text-[#1090D0] hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1090D0] rounded";
  const card =
    "w-full max-w-xl rounded-xl shadow-md bg-white p-6 border border-[#D2EFFF]";

  return (
    <section
      className={`w-full min-h-[40vh] flex items-center justify-center py-12 px-4 sm:px-6 ${className}`}
      aria-labelledby="ci-empty-state-heading"
    >
      <div className={card} role="region" aria-labelledby="ci-empty-state-heading">
        <header className="mb-2">
          <h2
            id="ci-empty-state-heading"
            className="text-xl font-semibold text-[#282829]"
          >
            {isLocked ? "🔐 Competitor Insights Locked" : "🎯 No Competitors Added Yet"}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {isLocked
              ? "Your current plan does not include competitor tracking. Upgrade to unlock:"
              : "Track your competitors to discover:"}
          </p>
        </header>

        <ul className="mt-3 space-y-1 text-sm text-gray-700 list-disc pl-5">
          <li>Keyword & backlink gaps</li>
          <li>SERP layout insights</li>
          <li>Speed & content optimization ideas</li>
          <li>AI‑powered SEO suggestions</li>
        </ul>

        {!isLocked ? (
          <>
            <p className="mt-4 text-sm text-gray-700">
              🚀 Add your first competitor to get started.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {/* <button
                type="button"
                onClick={onAdd}
                className={primaryBtn}
                aria-label="Add Competitor"
              >
                <span className="mr-2" aria-hidden>
                  ➕
                </span>
                Add Competitor
              </button> */}
                <DemoAddCompetitorModal />
              <button
                type="button"
                onClick={onLearnMore}
                className={ghostLink}
                aria-label="Learn more about Competitor Insights"
              >
                Learn More <span className="ml-1" aria-hidden>↗</span>
              </button>
            </div>

            {Number(allowedSeats) > 0 && (
              <p className="mt-6 text-xs text-gray-500">
                ℹ️ You can add up to{" "}
                <span className="font-medium text-gray-700">{allowedSeats}</span>{" "}
                competitors on your current plan.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onUpgrade}
                className={primaryBtn}
                aria-label="Upgrade Plan"
              >
                <span className="mr-2" aria-hidden>
                  🚀
                </span>
                Upgrade Plan
              </button>

              <button
                type="button"
                onClick={onLearnMore}
                className={ghostLink}
                aria-label="Learn more about upgrading"
              >
                Learn More <span className="ml-1" aria-hidden>↗</span>
              </button>
            </div>

            <p className="mt-6 text-xs text-gray-500">
              Your{planName ? ` ${planName}` : ""} plan doesn’t allow competitor
              tracking yet. Upgrade to enable this panel.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
