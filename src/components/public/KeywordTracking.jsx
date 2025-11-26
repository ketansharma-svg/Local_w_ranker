"use client"
import { Modal, Select } from "antd"
import axios from "axios"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowDown, ArrowUp } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import { CiGlobe } from "react-icons/ci"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { KeywordDashboard } from "./keyword-tracking-charts"
import { FcGoogle } from "react-icons/fc"
import { BASE_URL_WR } from "@/src/util/api"
const { Option } = Select


const KeywordResearchTool = ({ projectId, isSharedProject, access_type, apidata}) => {
  const [keywords, setKeywords] = useState([])

  const allDates = new Set()
  keywords.forEach((keyword) => {
    keyword.keyword_details.forEach((detail) => {
      allDates.add(detail.date)
    })
  })

const sortedDates = Array.from(allDates).sort((a, b) => {
  const [dayA, monthA, yearA] = a.split("-").map(Number);
  const [dayB, monthB, yearB] = b.split("-").map(Number);
  return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
});




  const processedKeywords = keywords.map((keyword) => {
    // Sort details by date
    const sortedDetails = [...keyword.keyword_details].sort((a, b) => new Date(a.datetime) - new Date(b.datetime))

    // Get earliest date (for ADDED ON column)
    const earliestDate = sortedDetails.length > 0 ? sortedDetails[0].date : "N/A"

    // Get latest detail
    const latestDetail = sortedDetails.length > 0 ? sortedDetails[sortedDetails.length - 1] : null

    // Calculate rank changes between consecutive dates
    const rankChanges = {}
    for (let i = 1; i < sortedDetails.length; i++) {
      const prevRank = sortedDetails[i - 1].rank
      const currentRank = sortedDetails[i].rank

      // Lower rank number is better in SEO (position 1 is better than position 2)
      // So if current rank is lower than previous, it's an improvement
      if (prevRank !== 0 && currentRank !== 0) {
        rankChanges[sortedDetails[i].date] = {
          change: prevRank - currentRank,
          prevRank,
          currentRank,
        }
      }
    }

    // Calculate overall rank change (first date to latest date)
    let overallChange = null
    if (sortedDetails.length >= 2) {
      const firstRank = sortedDetails[0].rank
      const lastRank = sortedDetails[sortedDetails.length - 1].rank

      if (firstRank !== 0 && lastRank !== 0) {
        overallChange = {
          change: firstRank - lastRank,
          firstRank,
          lastRank,
        }
      }
    }

    return {
      ...keyword,
      earliestDate,
      latestDetail,
      rankChanges,
      overallChange,
    }
  })

  // Render rank change indicator
  const RankChangeIndicator = ({ change }) => {
    if (!change || change === 0) return ""

    return change > 0 ? (
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center text-green-600"
      >
        <ArrowUp size={16} className="mr-1" />
        <span>+{change}</span>
      </motion.div>
    ) : (
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center text-red-600"
      >
        <ArrowDown size={16} className="mr-1" />
        <span>{change}</span>
      </motion.div>
    )
  }
  const [modalKeywords, setModalKeywords] = useState([])
  const [newKeyword, setNewKeyword] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [locationOptions, setLocationOptions] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)

  const totalKeywords = keywords.length
  const googleRankedKeywords = keywords.filter((item) => item.keyword_details?.[0]?.rank).length

  // Counting keywords based on rank categories
  const top3Keywords = keywords.filter(
    (item) => item.keyword_details?.[0]?.rank > 0 && item.keyword_details?.[0]?.rank <= 3,
  ).length

  const top6Keywords = keywords.filter(
    (item) => item.keyword_details?.[0]?.rank > 0 && item.keyword_details?.[0]?.rank <= 6,
  ).length

  const top10Keywords = keywords.filter(
    (item) => item.keyword_details?.[0]?.rank > 0 && item.keyword_details?.[0]?.rank <= 10,
  ).length

  const top50Keywords = keywords.filter(
    (item) => item.keyword_details?.[0]?.rank > 0 && item.keyword_details?.[0]?.rank <= 50,
  ).length

  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        setLoading(true)
        const validKeywords = (apidata.keyword_data || []).filter(
          (item) => item.keyword_details?.[0]?.rank !== undefined && item.keyword_details?.[0]?.serp_page !== undefined,
        )
        setKeywords(validKeywords)
      } catch (err) {
        setError("Failed to load keywords.")
      } finally {
        setLoading(false) // Stop loading
      }
    }
    fetchKeywords()
  }, [projectId])

  const handleInputChange = (e) => {
    const pastedKeywords = e.target.value
      .split(",")
      .map((kw) => kw.trim())
      .filter((kw) => kw && !modalKeywords.includes(kw))

    if (pastedKeywords.length > 1) {
      setModalKeywords([...modalKeywords, ...pastedKeywords])
      setNewKeyword("")
    } else {
      setNewKeyword(e.target.value)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addKeyword()
    }
  }
const handlePaste = (e) => {
  e.preventDefault()
  const pasteData = e.clipboardData.getData("Text")
  const pastedKeywords = pasteData
    .split(/[\n,]/)
    .map((kw) => kw.trim())
    .filter((kw) => kw && !modalKeywords.includes(kw))

  if (pastedKeywords.length) {
    setModalKeywords([...modalKeywords, ...pastedKeywords])
    setNewKeyword("") // clear the input field
  }
}

  const addKeyword = () => {
    if (!newKeyword.trim()) return
    const keywordArray = newKeyword
      .split(",")
      .map((kw) => kw.trim())
      .filter((kw) => kw && !modalKeywords.includes(kw))
    setModalKeywords([...modalKeywords, ...keywordArray])
    setNewKeyword("")
  }
  const removeKeyword = (index) => {
    setModalKeywords(modalKeywords.filter((_, i) => i !== index))
  }
  const handleSubmit = async () => {
    if (!modalKeywords.length || !selectedLocation) {
    toast.error("Please enter keywords and select a location", {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "light",
    });
    return;
  }
    setLoading(true)

    try {
      await axios.post(`${BASE_URL_WR}project-keywords/`, {
        keywords: modalKeywords,
        project: projectId,
        location: selectedLocation ? selectedLocation.name : null,
        location_code: selectedLocation ? selectedLocation.location_code : null,
      })
      setModalKeywords([])
      setNewKeyword("")
      setSelectedLocation(null) // Reset selected location after submission
      const response = await axios.get(`${BASE_URL_WR}get-rank-status/?project_id=${projectId}`)
      setKeywords(response?.data.keyword_data || [])
      setIsModalOpen(false)
      toast.success("Keywords added successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      })
    } catch (err) {
      if (err.response && err.response.data.message) {
        const errorMessage = err.response.data.message
        if (errorMessage.includes("Keyword adding limit reached")) {
          toast.error("You can only add up to 10 keywords per project !", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
          })
        } else {
          toast.error(errorMessage)
        }
      } else {
        toast.error("Failed to add keywords.")
      }
    }

    setLoading(false)
  }

  const countryNameToCode = {
    "United States": "us",
    Canada: "ca",
    "United Kingdom": "gb",
    Germany: "de",
    France: "fr",
    India: "in",
    China: "cn",
    Japan: "jp",
    Australia: "au",
    Brazil: "br",
    Italy: "it",
    Mexico: "mx",
    Russia: "ru",
    "South Korea": "kr",
    Spain: "es",
    Netherlands: "nl",
    Sweden: "se",
    Switzerland: "ch",
    "South Africa": "za",
    "United Arab Emirates": "ae",
    "Saudi Arabia": "sa",
    Argentina: "ar",
    Pakistan: "pk",
    Bangladesh: "bd",
    Indonesia: "id",
    Turkey: "tr",
    Vietnam: "vn",
    Philippines: "ph",
    Thailand: "th",
  }
  const [noLocationFound, setNoLocationFound] = useState(false);
const [locationSearchQuery, setLocationSearchQuery] = useState("");

  const handleSearchLocation = async (value) => {
    setLocationSearchQuery(value); 
    if (value.length < 3) {
      setLocationOptions([]) // clear options if input is too short
      setNoLocationFound(false);
      return
    }
    try {
      const res = await axios.get(`https://dashboard.wranker.com/api/search-locations/?search_term=${value}`)
      if (res.data.status === "success") {
        setLocationOptions(res.data.data);
         setNoLocationFound(res.data.data.length === 0);
      }
    } catch (err) {
      console.error("Location fetch error", err);
      setLocationOptions([]);
    setNoLocationFound(true);
    }
  }

  const getFlagUrl = (country) => {
    if (!country) return null
    const countryCode = countryNameToCode[country] || "un" // Default to unknown flag
    return `https://flagcdn.com/w40/${countryCode}.png`
  }
  return (
    <div className="my-4 rounded-lg bg-white p-6 shadow-lg">
      <ToastContainer />
      <div className="flex items-center justify-between border-b pb-4 ">
        <div className="flex items-center gap-3">
          <Image src={"/images/new/live-keyword-tracking-img.png"} alt="Keyword Tracking" width={80} height={80} />
          <h2 className="text-2xl font-bold text-homeblack">Live Keyword Tracking</h2>
        </div>
        <div>
          {!(access_type === "view" && isSharedProject) && (
            <button
              className="hover:bg-blue-600 rounded bg-primary px-4 py-2 text-white shadow-lightblue"
              onClick={() => {
                setNewKeyword("")
                setModalKeywords([])
                setIsModalOpen(true)
              }}
            >
              Add Keywords
            </button>
          )}
        </div>
      </div>
      <motion.div
        className="my-6  text-homeblack"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {loading ? (
          <motion.p
            className="text-center text-lg font-semibold text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Loading...
          </motion.p>
        ) : totalKeywords === 0 ? (
          <motion.p
            className="text-center text-lg font-semibold text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            No data available
          </motion.p>
        ) : (
          <>
            <AnimatePresence>
              <KeywordDashboard keywords={keywords} />
            </AnimatePresence>
          </>
        )}
      </motion.div>
      {/* Keyword Input Modal */}
      <Modal
        title={<span className="text-primary">Add Keywords</span>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
        height={1000}
        className=" !top-50"
      >
        <div className="space-y-4">
          <label className="block font-medium">Enter keywords *</label>
          {/* Show keywords inside modal */}
          <div className="flex flex-wrap gap-2">
            {modalKeywords.map((kw, index) => (
              <div
                key={index}
                className="text-md flex items-center gap-1 rounded-full bg-[#D9E9F9] px-2 py-1 text-primary"
              >
                {kw}
                <button className="ml-1 text-lg text-primary hover:text-red-800" onClick={() => removeKeyword(index)}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <input
            type="text"
            value={newKeyword}
            onChange={handleInputChange}
              onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Type keywords and press Enter or ,"
            className="w-full rounded border p-2 outline-none"
          />
          <div>
            <label className="block font-medium">Select Location</label>
            <Select
              showSearch
              placeholder="Search location (enter at least 3 characters)"
              onSearch={handleSearchLocation}
              onChange={(value, option) =>{ setSelectedLocation(option.data); setNoLocationFound(false);}}
              filterOption={false}
              style={{ width: "100%" }}
               notFoundContent={
    <div className="p-2 text-center text-gray-500">
      {locationSearchQuery.length < 3
        ? "Enter at least 3 characters to search"
        : noLocationFound
        ? "No locations found for your search"
        : "Searching..."}
    </div>
  }
            >
              {locationOptions.map((loc) => (
                <Option key={loc.id} value={loc.name} data={loc}>
                  {loc.name} ({loc.target_type})
                </Option>
              ))}
            </Select>
          </div>
          <button
            onClick={handleSubmit}
           className={`w-full rounded px-4 py-2 text-white ${
    (!modalKeywords.length || !selectedLocation) 
      ? "bg-gray-400 cursor-not-allowed" 
      : "bg-primary hover:bg-blue-600"
  }`}
            disabled={!modalKeywords.length || !selectedLocation || loading}
          >
            {loading ? "Adding..." : "Add Keywords"}
          </button>
        </div>
      </Modal>
      {/* {error && <p className="mt-4 text-red-500">{error}</p>} */}
      <div className="mt-6">
        {/* <h3 className="my-2 text-lg font-semibold">
          Total Keyword Added :{" "}
          <span className="text-black">{keywords.length}</span>
        </h3> */}
        <div className="keywordtable1 overflow-x-auto rounded-lg relative">
          <table className="min-w-full border border-gray-300 text-left shadow-md ">
            <thead className="sticky top-0 bg-[#D9E9F9] shadow-lg">
              <tr className="text-black-2">
                <th className="border p-2 text-base font-bold ">KEYWORD</th>
                <th className="border p-2 text-base font-bold">
                  <span className="flex items-center justify-center gap-1 min-w-[150px]">LOCATION</span>
                </th>
                <th className="border p-2 text-base font-bold">
                  <span className="flex items-center justify-center gap-1 min-w-[150px]">ADDED ON</span>
                </th>
                <th className="border p-2 text-base font-bold">
                  <span className="flex items-center justify-center gap-1 min-w-[150px]">CURRENT RANK</span>
                </th>

                {sortedDates.map((date) => (
                  <th key={date} className="border p-2 text-base font-bold text-center">
                    {date}
                  </th>
                ))}
                <th className="border p-2 text-base font-bold">
                  <span className="flex items-center justify-center gap-1">LATEST URL</span>
                </th>
                <th className="border p-2 text-base font-bold">
                  {" "}
                  <span className="flex items-center justify-center gap-1">
                    <FcGoogle fontSize={20} /> URL
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {processedKeywords.map((item, index) => (
                <tr key={index} className="border-b odd:bg-white even:bg-gray-100 hover:bg-gray-50 text-black-2 ">
                  <td className="border p-2 capitalize font-medium">{item.keyword}</td>

                  <td className="p-2 text-center flex items-center justify-center gap-2">
                    {item.location ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={getFlagUrl(item.location) || "/placeholder.svg"}
                          alt={item.location}
                          className="w-5 h-3"
                        />
                        <span>{item.location}</span>
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </td>

                  <td className="border p-2 text-center">{item.created_date}</td>

                  <td className="border p-2 text-center">
                    {item.latestDetail && (
                      <div className="flex items-center justify-center gap-2 cursor-pointer font-medium">
                        <span>{item.latestDetail.rank || "-"}</span>
                        {item.overallChange && <RankChangeIndicator change={item.overallChange.change} />}
                      </div>
                    )}
                  </td>

                  {sortedDates.map((date) => {
                    const details = item.keyword_details.find((d) => d.date === date)
                    const rankChange = item.rankChanges[date]

                    return (
                      <td key={date} className="border p-2 text-center">
                        {details ? (
                          <div className="flex items-center justify-center gap-2 cursor-pointer">
                            <span>{details.rank || "-"}</span>
                            {rankChange && <RankChangeIndicator change={rankChange.change} />}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    )
                  })}
                  <td className="border p-2 text-center">
                    {item.latestDetail && item.latestDetail.serp_page && (
                      <a
                        href={item.latestDetail.serp_page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-medium hover:underline text-sm flex items-center gap-1 justify-center"
                      >
                        <CiGlobe className="text-xl" />
                        PAGE
                      </a>
                    )}
                  </td>
                  <td className="border p-2">
                    {item.latestDetail && item.latestDetail.google_page && (
                      <a
                        href={item.latestDetail.google_page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-medium hover:underline text-sm flex items-center gap-1 justify-center"
                      >
                        <FcGoogle /> Link
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {keywords.length === 0 && (
                <tr>
                  <td colSpan={sortedDates.length + 5} className="p-4 text-center text-gray-500">
                    No keywords found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default KeywordResearchTool

const StatsCard = ({ index, title, value, total, subtitle, imageSrc, imageAlt, additionalText }) => (
  <motion.div
    className="rounded-lg bg-white p-5 shadow transition-all duration-300 hover:shadow-lg space-y-1"
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ delay: 0.05 * index }}
  >
    <h3 className="text-lg font-semibold text-primary">{title}</h3>
    <p className="text-3xl font-bold flex items-center gap-4">
      {value && value + " / "}
      {total}
      {imageSrc && <Image src={imageSrc || "/placeholder.svg"} alt={imageAlt} width={26} height={28} />}
    </p>
    <p className="text-black text-xl">{additionalText}</p>
  </motion.div>
)
