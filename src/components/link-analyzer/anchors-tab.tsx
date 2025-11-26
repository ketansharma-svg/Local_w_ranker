import AnchorsSummarySectionOnly from "./AnchorTab/AnchorTextInsights"
import AnchorsTrendsTab from "./AnchorTab/AnchorsTrendsTab"
import AnchorsTab_DistributionDemo from "./AnchorTab/AnchorTypesDistribution"
import AnchorsSmartSuggestionsSection from "./AnchorTab/SmartSuggestions"

export const AnchorsTab = () => {
  return (
    <>
      <AnchorsSummarySectionOnly />
      <AnchorsTrendsTab />
      <AnchorsTab_DistributionDemo />
      {/* <AnchorsUsageTableDemo /> */}
      <AnchorsSmartSuggestionsSection />
    </>
  )
}
