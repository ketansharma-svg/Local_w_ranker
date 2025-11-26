"use client"
import { motion } from "framer-motion"
import { ArrowUp, ArrowDown, TrendingUp, BarChart3, WholeWord } from "lucide-react"
import Image from "next/image"
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
// Chart Card component for consistent styling
const ChartCard = ({ index, title, children }) => (
  <motion.div
    className="rounded-lg bg-white p-5 shadow transition-all duration-300 hover:shadow-lg"
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    exit={{ opacity: 0}}
    transition={{ delay: 0.05 * index, duration: 0.3 }}>
    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
      <BarChart3 className="h-5 w-5" />
      {title}
    </h3>
    {children}
  </motion.div>
)
// Animated bar for rank distribution chart
const AnimatedBar = ({ width, height, color, delay, label, value }) => (
  <div className="flex items-center mb-2">
    <div className="w-24 text-sm text-gray-600">{label}</div>
    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
      <motion.div
        className={`h-full ${color} rounded-full`}
        initial={{ width: 0 }}
        whileInView={{ width: `${width}%` }}
        transition={{ duration: 1, delay: delay, ease: "easeOut" }}/>
      <div className="absolute inset-0 flex items-center justify-end pr-3">
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  </div>
)
// Animated line for rank change chart
const AnimatedLine = ({ points, color, delay }) => (
  <motion.path
    d={points}
    stroke={color}
    strokeWidth="3"
    fill="none"
    strokeLinecap="round"
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: 1, opacity: 1 }}
    transition={{ duration: 2, delay: delay, ease: "easeInOut" }}
  />
)
// Rank Distribution Chart
export const RankDistributionChart = ({ keywords, index = 6 }) => {
  // Calculate rank distribution
  const calculateDistribution = () => {
    const distribution = {
      top3: 0,
      top10: 0,
      top20: 0,
      top50: 0,
      top100: 0,
      notRanked: 0,
    }
    keywords.forEach((keyword) => {
      // Get the latest rank
      const latestDetail = keyword.keyword_details.reduce((latest, detail) => {
        return new Date(latest.datetime) > new Date(detail.datetime) ? latest : detail
      }, keyword.keyword_details[0])
      const rank = latestDetail?.rank || 0
      if (rank === 0) distribution.notRanked++
      else if (rank <= 3) distribution.top3++
      else if (rank <= 10) distribution.top10++
      else if (rank <= 20) distribution.top20++
      else if (rank <= 50) distribution.top50++
      else distribution.top100++
    })
    return distribution
  }
  const distribution = calculateDistribution()
  const total = keywords.length
  return (
    <ChartCard index={index} title="Keyword Rank Distribution">
      <div className="space-y-5 pt-6">
        <AnimatedBar
          width={(distribution.top3 / total) * 100}
          color="bg-[#00976C]"
          delay={0.1}
          label="Top 3"
          value={distribution.top3}
        />
        <AnimatedBar
          width={(distribution.top10 / total) * 100}
          color="bg-[#1688C9]"
          delay={0.2}
          label="Top 4-10"
          value={distribution.top10}
        />
        <AnimatedBar
          width={(distribution.top20 / total) * 100}
          color="bg-[#8F6CF9]"
          delay={0.3}
          label="Top 11-20"
          value={distribution.top20}
        />
        <AnimatedBar
          width={(distribution.top50 / total) * 100}
          color="bg-[#6366F1]"
          delay={0.4}
          label="Top 21-50"
          value={distribution.top50}
        />
        <AnimatedBar
          width={(distribution.top100 / total) * 100}
          color="bg-[#7c9ce2]"
          delay={0.5}
          label="Top 51-100"
          value={distribution.top100}
        />
        <AnimatedBar
          width={(distribution.notRanked / total) * 100}
          color="bg-[#6B7280]"
          delay={0.6}
          label="Not Ranked"
          value={distribution.notRanked}
        />
      </div>
    </ChartCard>
  )
}
// Rank Change Chart
const RankChangeChart = ({ keywords, index = 7 }) => {
  const allDates = new Set();
  keywords.forEach((keyword) => {
    keyword.keyword_details.forEach((detail) => {
      allDates.add(detail.date);
    });
  });

const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));
  const data = sortedDates.map((date) => {
    let totalRank = 0, count = 0;
    keywords.forEach((keyword) => {
      const detail = keyword.keyword_details.find((d) => d.date === date);
      if (detail && detail.rank > 0) {
        totalRank += detail.rank;
        count++;
      }
    });
    return { date, averageRank: count > 0 ? totalRank / count : null };
  });

const calculateChanges = () => {
    if (sortedDates.length < 2) return { improved: 0, declined: 0, unchanged: 0 };
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    let improved = 0, declined = 0, unchanged = 0;
    keywords.forEach((keyword) => {
      const firstDetail = keyword.keyword_details.find((d) => d.date === firstDate);
      const lastDetail = keyword.keyword_details.find((d) => d.date === lastDate);
      if (firstDetail && lastDetail && firstDetail.rank > 0 && lastDetail.rank > 0) {
        if (lastDetail.rank < firstDetail.rank) improved++;
        else if (lastDetail.rank > firstDetail.rank) declined++;
        else unchanged++;
      }
    });
    return { improved, declined, unchanged };
  };
  const changes = calculateChanges();
  return (
    <ChartCard index={index} title="Keyword Rank Trends">
      <div className='flex '>
      <ResponsiveContainer width="100%" height={300} className={"flex-1"}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" angle={-0} textAnchor="end" height={50} tick={{ fontSize: 12 }} />
          <YAxis domain={[1, 50]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="averageRank" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex flex-col justify-evenly  pl-10 gap-3 flex-1">
        <div className="flex items-center">
          <motion.div className="w-10 h-10 bg-green-100 flex items-center justify-center rounded-full mr-3">
            <ArrowUp className="h-5 w-5 text-green-600" />
          </motion.div>
          <div>
            <div className="text-xl font-bold text-green-600">{changes.improved}</div>
            <div className="text-sm text-gray-500">Improved Keywords</div>
          </div>
        </div>

        <div className="flex items-center">
          <motion.div className="w-10 h-10 bg-red-100 flex items-center justify-center rounded-full mr-3">
            <ArrowDown className="h-5 w-5 text-red-600" />
          </motion.div>
          <div>
            <div className="text-xl font-bold text-red-600">{changes.declined}</div>
            <div className="text-sm text-gray-500">Declined Keywords</div>
          </div>
        </div>

        <div className="flex items-center">
          <motion.div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded-full mr-3">
            <span className="h-1 w-5 bg-gray-600 rounded-full"></span>
          </motion.div>
          <div>
            <div className="text-xl font-bold text-gray-600">{changes.unchanged}</div>
            <div className="text-sm text-gray-500">Unchanged Keywords</div>
          </div>
        </div>
      </div>
      </div>
      </ChartCard>
  );
};

// Top Movers Card
export const TopMoversCard = ({ keywords, index = 9 }) => {
  // Calculate the biggest movers (improved and declined)
  const calculateTopMovers = () => {
    // Get all unique dates
    const allDates = new Set()
    keywords.forEach((keyword) => {
      keyword.keyword_details.forEach((detail) => {
        allDates.add(detail.date)
      })
    })

    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort((a, b) => {
      return new Date(a) - new Date(b)
    })

    if (sortedDates.length < 2) return { improved: [], declined: [] }

    const firstDate = sortedDates[0]
    const lastDate = sortedDates[sortedDates.length - 1]

    const movers = keywords
      .map((keyword) => {
        const firstDetail = keyword.keyword_details.find((d) => d.date === firstDate)
        const lastDetail = keyword.keyword_details.find((d) => d.date === lastDate)

        if (firstDetail && lastDetail && firstDetail.rank > 0 && lastDetail.rank > 0) {
          const change = firstDetail.rank - lastDetail.rank
          return {
            keyword: keyword.keyword,
            firstRank: firstDetail.rank,
            lastRank: lastDetail.rank,
            change,
          }
        }
        return null
      })
      .filter(Boolean)

    // Sort by change (positive = improved, negative = declined)
    const improved = [...movers]
      .filter((m) => m.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 3)
    const declined = [...movers]
      .filter((m) => m.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 3)

    return { improved, declined }
  }

  const topMovers = calculateTopMovers()

  return (
    <ChartCard index={index} title="Top Movers">
      <div className="grid grid-cols-2  gap-6">
        <div className="">
          <h4 className="text-green-600 font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Most Improved
          </h4>

          {topMovers.improved.length > 0 ? (
            <div className="space-y-3">
              {topMovers.improved.map((mover, i) => (
                <motion.div
                  key={mover.keyword}
                  className="flex items-center p-3 bg-green-50 rounded-lg"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <div className="flex-1">
                    <div className="font-medium truncate" title={mover.keyword}>
                      {mover.keyword}
                    </div>
                    <div className="text-sm text-gray-500">
                      Rank {mover.firstRank} → {mover.lastRank}
                    </div>
                  </div>
                  <div className="flex items-center text-green-600 font-bold">
                    <ArrowUp className="h-4 w-4 mr-1" />
                    {mover.change}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">No improved keywords found</div>
          )}
        </div>

        <div className="">
          <h4 className="text-red-600 font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 transform rotate-180" />
            Most Declined
          </h4>

          {topMovers.declined.length > 0 ? (
            <div className="space-y-3">
              {topMovers.declined.map((mover, i) => (
                <motion.div
                  key={mover.keyword}
                  className="flex items-center p-3 bg-red-50 rounded-lg"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <div className="flex-1">
                    <div className="font-medium truncate" title={mover.keyword}>
                      {mover.keyword}
                    </div>
                    <div className="text-sm text-gray-500">
                      Rank {mover.firstRank} → {mover.lastRank}
                    </div>
                  </div>
                  <div className="flex items-center text-red-600 font-bold">
                    <ArrowDown className="h-4 w-4 mr-1" />
                    {Math.abs(mover.change)}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">No declined keywords found</div>
          )}
        </div>
      </div>
    </ChartCard>
  )
}

// Enhanced StatsCard with mini chart
export const EnhancedStatsCard = ({
  index,
  title,
  value,
  total,
  subtitle,
  icon,
  imageSrc,
  imageAlt,
  additionalText,
  keywords,
  type,
}) => {

  return (
    <motion.div
      className="rounded-lg bg-white p-5 shadow transition-all duration-300 hover:shadow-lg space-y-1"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.05 * index }}
    >
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold flex items-center gap-3">
          {value && value + " / "}
          {total}
          {icon && icon}
          {imageSrc && <Image src={imageSrc || "/placeholder.svg"} alt={imageAlt} width={26} height={28} />}
        </p>

      </div>
      <p className="text-black text-xl">{additionalText}</p>
    </motion.div>
  )
}

// Dashboard component that combines all charts
export const KeywordDashboard = ({ keywords }) => {
  // Calculate stats for the enhanced stat cards
  const calculateStats = () => {
    const totalKeywords = keywords.length

    // Get the latest details for each keyword
    const latestDetails = keywords.map((keyword) => {
      const latestDetail = keyword.keyword_details.reduce((latest, detail) => {
        return new Date(latest.datetime) > new Date(detail.datetime) ? latest : detail
      }, keyword.keyword_details[0])

      return {
        keyword: keyword.keyword,
        rank: latestDetail?.rank || 0,
      }
    })

    const googleRankedKeywords = latestDetails.filter((k) => k.rank > 0).length
    const top3Keywords = latestDetails.filter((k) => k.rank > 0 && k.rank <= 3).length
    const top6Keywords = latestDetails.filter((k) => k.rank > 0 && k.rank <= 6).length
    const top10Keywords = latestDetails.filter((k) => k.rank > 0 && k.rank <= 10).length
    const top50Keywords = latestDetails.filter((k) => k.rank > 0 && k.rank <= 50).length

    return {
      totalKeywords,
      googleRankedKeywords,
      top3Keywords,
      top6Keywords,
      top10Keywords,
      top50Keywords,
    }
  }

  const stats = calculateStats()

  return (
    <div className="space-y-6">
      {/* Enhanced Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4  gap-6">
        <EnhancedStatsCard
          index={0}
          title="Total Keywords"
          value=""
          total={stats.totalKeywords}
          subtitle=""
          // icon= { <WholeWord className="text-[#57E7BA] size-12" />}
          imageAlt="Keyword Tracking"
           imageSrc="/images/new/top1.png"
          additionalText=""
          keywords={keywords}
          type="total"
        />
        <EnhancedStatsCard
          index={1}
          title="Google Ranked Keywords"
          value={stats.googleRankedKeywords}
          total={stats.totalKeywords}
          subtitle="Ranked"
          imageSrc="/images/new/top.png"
          imageAlt="Keyword Tracking"
          additionalText="In Google Rank"
          keywords={keywords}
          type="ranked"
        />
        <EnhancedStatsCard
          index={2}
          title="Top 3 Keywords"
          value={stats.top3Keywords}
          total={stats.totalKeywords}
          subtitle="Top 3"
          imageSrc="/images/new/top.png"
          imageAlt="Keyword Tracking"
          additionalText="In Top 3"
          keywords={keywords}
          type="top3"
        />
        <EnhancedStatsCard
          index={3}
          title="Top 6 Keywords"
          value={stats.top6Keywords}
          total={stats.totalKeywords}
          subtitle="Top 6"
          imageSrc="/images/new/top.png"
          imageAlt="Keyword Tracking"
          additionalText="In Top 6"
          keywords={keywords}
          type="top6"
        />
        <EnhancedStatsCard
          index={4}
          title="Top 10 Keywords"
          value={stats.top10Keywords}
          total={stats.totalKeywords}
          subtitle="Top 10"
          imageSrc="/images/new/top.png"
          imageAlt="Keyword Tracking"
          additionalText="In Top 10"
          keywords={keywords}
          type="top10"
        />
        <EnhancedStatsCard
          index={5}
          title="Top 50 Keywords"
          value={stats.top50Keywords}
          total={stats.totalKeywords}
          subtitle="Top 50"
          imageSrc="/images/new/top.png"
          imageAlt="Keyword Tracking"
          additionalText="In Top 50"
          keywords={keywords}
          type="top50"
        />
<div className='col-span-2'>
      <TopMoversCard keywords={keywords}  /></div>

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankDistributionChart keywords={keywords} />
        <RankChangeChart keywords={keywords} />
      </div>

    </div>
  )
}

