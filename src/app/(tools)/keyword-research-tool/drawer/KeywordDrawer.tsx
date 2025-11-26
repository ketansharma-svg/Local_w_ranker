import React from 'react'
import KeywordKpiSummary from "./KpiSummary";
import KeywordDifficultyOverview from "./DifficultyOverview";
import DemoSerpSummary from "./SerpSummary";
import DemoTrendSeasonality from "./TrendSeasonality";
import DemoKeywordAnalyzerSections from "./KeywordAnalyzer";
import MatchScoreWhatIf from './MatchScoreWhatIf';
export default function Page() {
  return (
    <div>
      <KeywordKpiSummary />
      <KeywordDifficultyOverview />
      <DemoSerpSummary />
      <DemoTrendSeasonality />
      <DemoKeywordAnalyzerSections />
      <MatchScoreWhatIf />
    </div>
  )
}
