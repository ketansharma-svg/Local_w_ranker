"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import axios from "axios"
import { Select, Spin, Table, Tooltip, Button } from "antd"
import { toast } from "sonner"
import { MdStar } from "react-icons/md"
import Image from "next/image"
import Cookies from "js-cookie"
// import type { DatePickerProps } from 'antd';
import { DatePicker, Space } from "antd"
import * as XLSX from "xlsx"
import dayjs from "dayjs"
import { FilterOutlined } from "@ant-design/icons"
import { Modal, Input, InputNumber } from "antd"
import { BASE_URL_WR } from "@/src/util/api"
import { SearchOutlined, CloseOutlined } from "@ant-design/icons"

const { Option } = Select

export default function KeywordPlanner() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { RangePicker } = DatePicker
  const [selectedDates, setSelectedDates] = useState([
    dayjs().startOf("month"),
    dayjs().startOf("month").subtract(3, "month"),
  ])
  // const [selectedDates, setSelectedDates] = useState([]);
  const dateFormat = "YYYY/MM/DD"
  const formatDates = (dates) => {
    const startMonthYear = dayjs(dates[0]).format("MMMM YYYY")
    const endMonthYear = dayjs(dates[1]).format("MMMM YYYY")
    return { startMonthYear, endMonthYear }
  }

  const [filterVisible, setFilterVisible] = useState(false)
  const [currentFilterColumn, setCurrentFilterColumn] = useState(null)
  const [filterCondition, setFilterCondition] = useState("equals")
  const [filterValue, setFilterValue] = useState("")
  const [filters, setFilters] = useState({})
  const [activeFilters, setActiveFilters] = useState([])

  const [fieldSelectorVisible, setFieldSelectorVisible] = useState(false)
  const [fieldSearchTerm, setFieldSearchTerm] = useState("")

  const { startMonthYear, endMonthYear } = formatDates(selectedDates)
  const [showlanguage, setshowlanguage] = useState(false)
  // const handleDateChange = (dates, dateStrings) => {
  //   if (dates && dates.length === 2) {
  //     // Extract the month and year for the selected range
  //     const startMonthYear = dayjs(dates[0]).format('MMMM YYYY'); // "July 2024"
  //     const endMonthYear = dayjs(dates[1]).format('MMMM YYYY');   // "July 2024"
  //     setSelectedDates([startMonthYear, endMonthYear]);
  //     const apiPayload =
  //     {
  //       startMonthYear,
  //       endMonthYear,
  //     };
  //     // Make API call here
  //   } else {
  //   }
  // };

  const handleDateChange = (dates, dateStrings) => {
    if (dates && dates.length === 2) {
      const startMonthYear = dayjs(dates[0]).format("MMMM YYYY")
      const endMonthYear = dayjs(dates[1]).format("MMMM YYYY")
      setSelectedDates(dates)

      const apiPayload = {
        startMonthYear,
        endMonthYear,
      }
    } else {
    }
  }

  const allOptions = [
    { value: "avg_monthly_searches", label: "Avg. monthly searches" },
    { value: "competition_enum", label: "Competition" },
    { value: "low_top_of_page_bid", label: "Top Of The Page Bid (Low range)" },
    { value: "high_top_of_page_bid", label: "Top Of The Page Bid (High range)" },
    { value: "competition_index", label: "Competition (Index Value)" },
    { value: "volume_rank", label: "Volume Rank" },
    { value: "competition_rank", label: "Competition Rank" },
    { value: "bid_rank", label: "Bid Rank" },
    { value: "overall_rank", label: "Overall Rank" },
  ]

  // Initialize column visibility with all columns visible
  const initialColumnVisibility = allOptions.reduce((acc, option) => {
    acc[option.value] = true
    return acc
  }, {})

  // const App = () => {
  const [selectedServices, setSelectedServices] = useState(allOptions.map((option) => option.value))
  const [columnVisibility, setColumnVisibility] = useState(initialColumnVisibility)

  const handleServiceChange = (selectedValues) => {
    setSelectedServices(selectedValues)

    // Update column visibility based on selection
    const updatedColumnVisibility = { ...initialColumnVisibility }
    allOptions.forEach((option) => {
      updatedColumnVisibility[option.value] = selectedValues.includes(option.value)
    })

    setColumnVisibility(updatedColumnVisibility)
  }

  const showFilterModal = (columnKey) => {
    setCurrentFilterColumn(columnKey)
    setFilterCondition(filters[columnKey]?.condition || "equals")
    setFilterValue(filters[columnKey]?.value || "")
    setFilterVisible(true)
  }

  const handleFilterApply = () => {
    if (currentFilterColumn && filterValue !== "") {
      const newFilter = {
        condition: filterCondition,
        value: filterValue,
      }

      setFilters({
        ...filters,
        [currentFilterColumn]: newFilter,
      })

      // Update active filters display
      const fieldLabel =
        currentFilterColumn === "keyword"
          ? "Keyword"
          : allOptions.find((opt) => opt.value === currentFilterColumn)?.label || currentFilterColumn

      const conditionSymbol =
        filterCondition === "equals"
          ? "="
          : filterCondition === "greaterThan"
            ? ">="
            : filterCondition === "lessThan"
              ? "<="
              : filterCondition === "contains"
                ? "contains"
                : "="

      const filterDisplay = `${fieldLabel} ${conditionSymbol} ${filterValue}`

      setActiveFilters((prev) => {
        const filtered = prev.filter((f) => f.column !== currentFilterColumn)
        return [...filtered, { column: currentFilterColumn, display: filterDisplay }]
      })
    }
    setFilterVisible(false)
    setFilterCondition("equals")
    setFilterValue("")
  }

  const handleFilterClear = () => {
    if (currentFilterColumn) {
      const newFilters = { ...filters }
      delete newFilters[currentFilterColumn]
      setFilters(newFilters)

      // Remove from active filters display
      setActiveFilters((prev) => prev.filter((f) => f.column !== currentFilterColumn))
    }
    setFilterVisible(false)
    setFilterCondition("equals")
    setFilterValue("")
  }

   const handleClearAllFilters = () => {
    setFilters({})
    setActiveFilters([])
  }

  const removeFilter = (columnKey) => {
    const newFilters = { ...filters }
    delete newFilters[columnKey]
    setFilters(newFilters)
    setActiveFilters((prev) => prev.filter((f) => f.column !== columnKey))
  }

  const filterData = (data) => {
    return data.filter((item) => {
      for (const key in filters) {
        const filter = filters[key]
        const itemValue = item[key]

        if (typeof itemValue === "number") {
          const numValue = Number.parseFloat(filter.value)
          if (filter.condition === "equals" && itemValue !== numValue) return false
          if (filter.condition === "greaterThan" && itemValue <= numValue) return false
          if (filter.condition === "lessThan" && itemValue >= numValue) return false
        } else if (typeof itemValue === "string") {
          if (filter.condition === "equals" && itemValue.toLowerCase() !== filter.value.toLowerCase()) return false
          if (filter.condition === "contains" && !itemValue.toLowerCase().includes(filter.value.toLowerCase()))
            return false
        }
      }
      return true
    })
  }

  const columns = [
    {
      title: (
        <Tooltip title="Keyword description">
          <span className="cursor-help">Keyword</span>
        </Tooltip>
      ),
      dataIndex: "keyword",
      key: "keyword",
      fixed: "left",
      sorter: (a, b) => a.keyword.localeCompare(b.keyword),
    },
    {
      title: (
        <Tooltip title="Average monthly searches (&quot;Avg. monthly searches&quot;) shows the average number of searches for this keyword and its close variants based on the month range as well as the location and Search Network settings you selected. You can use this information to see how popular your keywords are during different times of the year.">
          <span className="cursor-help">Avg. monthly searches</span>
        </Tooltip>
      ),
      dataIndex: "avg_monthly_searches",
      key: "avg_monthly_searches",
      align: "center",
      sorter: (a, b) => a.avg_monthly_searches - b.avg_monthly_searches,
      hidden: !columnVisibility["avg_monthly_searches"],
    },
    {
      title: (
        <Tooltip title="'Competition' shows how competitive ad placement is for a keyword, specific to the location and Search Network targeting options that you've selected. The level of competition  low, medium or high  is determined by the number of advertisers bidding on each keyword relative to all keywords across Google. If we don't have enough data, you'll see a dash (-).">
          <span className="cursor-help">Competition</span>
        </Tooltip>
      ),
      dataIndex: "competition_enum",
      key: "competition_enum",
      align: "center",
      sorter: (a, b) => a.competition_enum.localeCompare(b.competition_enum),
      hidden: !columnVisibility["competition_enum"],
    },
    {
      title: (
        <Tooltip title="&quot;Top of page bid (low range)&quot; shows the lower range of what advertisers have historically paid for a keyword top of page bid, based on your location and Search Network settings. The average CPC of your keywords may vary.">
          <span className="cursor-help">Top Of The Page Bid (Low range)</span>
        </Tooltip>
      ),
      dataIndex: "low_top_of_page_bid",
      key: "low_top_of_page_bid",
      align: "center",
      render: (value) => `$${value.toFixed(2)}`,
      sorter: (a, b) => a.low_top_of_page_bid - b.low_top_of_page_bid,
      hidden: !columnVisibility["low_top_of_page_bid"],
    },
    {
      title: (
        <Tooltip title="&quot;Top of page bid (high range)&quot; shows the higher range of what advertisers have historically paid for a keywords top of page bid, based on your location and Search Network settings. The average CPC of your keywords may vary.">
          <span className="cursor-help">Top Of The Page Bid (High range)</span>
        </Tooltip>
      ),
      dataIndex: "high_top_of_page_bid",
      key: "high_top_of_page_bid",
      align: "center",
      render: (value) => `$${value.toFixed(2)}`,
      sorter: (a, b) => a.high_top_of_page_bid - b.high_top_of_page_bid,
      hidden: !columnVisibility["high_top_of_page_bid"],
    },
    {
      title: (
        <Tooltip title="Competition (indexed value) shows how competitive ad placement is for a keyword, specific to the location and Search Network targeting options that you've selected. The level of competition from 0-100 is determined by the number of ad slots filled divided by the total number of ad slots available. If not enough data is available, you'll see a dash (-).">
          <span className="cursor-help">Competition (Index Value)</span>
        </Tooltip>
      ),
      dataIndex: "competition_index",
      key: "competition_index",
      align: "center",
      sorter: (a, b) => a.competition_index - b.competition_index,
      hidden: !columnVisibility["competition_index"],
    },
    {
      title: (
        <Tooltip title="This ranks keywords based on their average monthly search volume (avg_monthly_searches) in descending order. A lower rank value (e.g., 1) indicates higher search volume and greater popularity among users.">
          <span className="cursor-help">Volume Rank</span>
        </Tooltip>
      ),
      dataIndex: "volume_rank",
      key: "volume_rank",
      align: "center",
      sorter: (a, b) => a.volume_rank - b.volume_rank,
      hidden: !columnVisibility["volume_rank"],
    },
    {
      title: (
        <Tooltip title="This ranks keywords based on the level of advertiser competition (competition_enum). The competition is converted to numeric values (LOW = 1, MEDIUM = 2, HIGH = 3), and the rank is assigned in ascending order. Lower numeric values correspond to less competitive keywords, and they are ranked higher.">
          <span className="cursor-help">Competition Rank</span>
        </Tooltip>
      ),
      dataIndex: "competition_rank",
      key: "competition_rank",
      align: "center",
      sorter: (a, b) => a.competition_rank - b.competition_rank,
      hidden: !columnVisibility["competition_rank"],
    },
    {
      title: (
        <Tooltip title="This ranks keywords based on the average of the low and high top-of-page bid estimates (low_top_of_page_bid and high_top_of_page_bid) in descending order. Higher average bids are ranked higher, as they often indicate higher commercial value or advertiser demand.">
          <span className="cursor-help">Bid Rank</span>
        </Tooltip>
      ),
      dataIndex: "bid_rank",
      key: "bid_rank",
      align: "center",
      sorter: (a, b) => a.bid_rank - b.bid_rank,
      hidden: !columnVisibility["bid_rank"],
    },
    {
      title: (
        <Tooltip title="This is a weighted rank calculated by combining the Volume Rank, Competition Rank, and Bid Rank with specific weights (50% for Volume Rank, 30% for Competition Rank, and 20% for Bid Rank). The final rank is normalized and rounded to two decimal places.">
          <span className="cursor-help">Overall Rank</span>
        </Tooltip>
      ),
      dataIndex: "overall_rank",
      key: "overall_rank",
      render: (text) => <p>{Number(text).toFixed(1)}</p>,
      align: "center",
      sorter: (a, b) => a.overall_rank - b.overall_rank,
      hidden: !columnVisibility["overall_rank"],
    },
  ]

  const handleDownload = () => {
    const dataToExport = sortedKeywords.map((item) => {
      const row = {}
      columns.forEach((column) => {
        if (!column.hidden) {
          let value = item[column.dataIndex]
          if (column.dataIndex === "low_top_of_page_bid" || column.dataIndex === "high_top_of_page_bid") {
            value = `$${value.toFixed(2)}`
          } else if (column.dataIndex === "overall_rank") {
            value = Number(value).toFixed(1)
          }
          row[column.title.props.children.props.children] = value
        }
      })
      return row
    })

    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(dataToExport)

    // Set column widths
    const colWidths = columns
      .filter((col) => !col.hidden)
      .map((col) => ({ wch: Math.max(col.title.props.children.props.children.length, 15) }))
    ws["!cols"] = colWidths

    // Create a workbook and append the worksheet
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Keywords")

    // Export the workbook as an Excel file
    XLSX.writeFile(wb, "keywords.xlsx")
  }

  // Filter modal
  const renderFilterModalContent = () => {
    const isNumeric =
      currentFilterColumn &&
      [
        "avg_monthly_searches",
        "low_top_of_page_bid",
        "high_top_of_page_bid",
        "competition_index",
        "volume_rank",
        "competition_rank",
        "bid_rank",
        "overall_rank",
      ].includes(currentFilterColumn)

    const fieldLabel =
      currentFilterColumn === "keyword"
        ? "Keyword"
        : allOptions.find((opt) => opt.value === currentFilterColumn)?.label || currentFilterColumn

    return (
      <div className="p-4 w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">{fieldLabel}</h3>
          {/* <Button type="text" icon={<CloseOutlined />} onClick={() => setFilterVisible(false)} /> */}
        </div>

        <div className="flex gap-2 mb-4">
          {isNumeric ? (
            <>
              <Select value={filterCondition} onChange={setFilterCondition} className="w-20">
                <Option value="equals">=</Option>
                <Option value="greaterThan">&gt;=</Option>
                <Option value="lessThan">&lt;=</Option>
              </Select>
              <InputNumber value={filterValue} onChange={setFilterValue} className="flex-1" placeholder="Amount" />
            </>
          ) : (
            <>
              <Select value={filterCondition} onChange={setFilterCondition} className="w-32">
                <Option value="equals">Equals</Option>
                <Option value="contains">Contains</Option>
              </Select>
              <Input
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="flex-1"
                placeholder="Enter value"
              />
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handleFilterClear} danger>
            Clear
          </Button>
          <Button type="primary" onClick={handleFilterApply}>
            Apply
          </Button>
        </div>
      </div>
    )
  }

  const renderFieldSelectorModal = () => {
    const filteredFields = allOptions.filter((option) =>
      option.label.toLowerCase().includes(fieldSearchTerm.toLowerCase()),
    )

    return (
      <div className="p-4 w-80">
        <div className="mb-4">
          <Input
            placeholder="Search"
            value={fieldSearchTerm}
            onChange={(e) => setFieldSearchTerm(e.target.value)}
            suffix={<SearchOutlined />}
            className="w-full"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filteredFields.map((field) => (
            <div
              key={field.value}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
              onClick={() => {
                setCurrentFilterColumn(field.value)
                setFieldSelectorVisible(false)
                setFilterVisible(true)
                setFieldSearchTerm("")
              }}
            >
              {field.label}
            </div>
          ))}
          <div
            className="px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
            onClick={() => {
              setCurrentFilterColumn("keyword")
              setFieldSelectorVisible(false)
              setFilterVisible(true)
              setFieldSearchTerm("")
            }}
          >
            Keyword
          </div>
        </div>
      </div>
    )
  }

  const [activeTab, setActiveTab] = useState("keyword")

  const [websiteURL, setWebsiteURL] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("suggestionurl")
      return saved ? JSON.parse(saved) : ""
    }
    return ""
  })
  const [seedKeywords, setSeedKeywords] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("seedKeywords")
      return saved ? JSON.parse(saved) : []
    }
    return ""
  })
  const [inputValue, setInputValue] = useState("")

  const addKeyword = useCallback((keyword) => {
    setSeedKeywords((prevKeywords) => {
      if (!keyword.trim()) {
        toast.error("Keyword cannot be empty.")
        return prevKeywords
      }

      if (prevKeywords.length >= 10) {
        toast.error("You can only add up to 10 keywords.")
        return prevKeywords
      }

      if (prevKeywords.includes(keyword.trim())) {
        toast.error("This keyword already exists.")
        return prevKeywords
      }

      return [...prevKeywords, keyword.trim()]
    })
  }, [])

  const removeKeyword = useCallback((keywordToRemove) => {
    setSeedKeywords((prevKeywords) => prevKeywords.filter((keyword) => keyword !== keywordToRemove))
  }, [])

  const removeLastKeyword = useCallback(() => {
    if (seedKeywords.length > 0) {
      setSeedKeywords((prevKeywords) => prevKeywords.slice(0, -1))
    }
  }, [seedKeywords])

  const handleKeyInputChange = (e) => {
    setInputValue(e.target.value)
  }
  const handleInputKeyPress = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const values = inputValue
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
      values.forEach(addKeyword)
      setInputValue("")
    } else if (e.key === "Backspace" && inputValue === "" && seedKeywords.length > 0) {
      e.preventDefault()
      removeLastKeyword()
    }
  }
  const handlePaste = (e) => {
    e.preventDefault()
    const pasteData = e.clipboardData.getData("Text")
    const pastedKeywords = pasteData
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean)

    setSeedKeywords((prevKeywords) => {
      const newKeywords = [...prevKeywords]
      pastedKeywords.forEach((keyword) => {
        if (newKeywords.length < 10 && !newKeywords.includes(keyword)) {
          newKeywords.push(keyword)
        }
      })
      return newKeywords
    })

    setInputValue("")
  }

  const [selectedCountries, setSelectedCountries] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("selectedCountries")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  const [loading, setLoading] = useState(false)
  const [suggestedKeywords, setSuggestedKeywords] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("suggestedKeywords")
      return saved ? JSON.parse(saved) : [] // Default to empty array for keywords
    }
    return [] // Default to empty array if window is undefined
  })
  useEffect(() => {
    if (suggestedKeywords?.length) {
      sessionStorage.setItem("suggestedKeywords", JSON.stringify(suggestedKeywords))
    }
    if (selectedCountries?.length) {
      sessionStorage.setItem("selectedCountries", JSON.stringify(selectedCountries))
    }
    if (websiteURL) {
      sessionStorage.setItem("suggestionurl", JSON.stringify(websiteURL)) // Save website URL to sessionStorage
    }
    if (seedKeywords) {
      sessionStorage.setItem("seedKeywords", JSON.stringify(seedKeywords)) // Save website URL to sessionStorage
    }
  }, [suggestedKeywords, websiteURL, seedKeywords, selectedCountries])

  const sortedKeywords = suggestedKeywords.sort((a, b) => {
    return b.is_requested_keyword - a.is_requested_keyword
  })

  const [duration, setDuration] = useState("3months")

  // const handleChangeDuration = (value) => {
  //   setDuration(value);
  // };

  const handleChangeDuration = (value) => {
    setDuration(value)
    let monthsTosub = 3

    if (value === "6months") {
      monthsTosub = 6
    } else if (value === "1year") {
      monthsTosub = 12
    }

    const newEndDate = dayjs(selectedDates[0]).subtract(monthsTosub, "month")
    setSelectedDates([selectedDates[0], newEndDate])
  }

  const handleGetResults = async () => {
    const access_token = Cookies.get("login_access_token_appw3")
    if (
      (activeTab === "keyword" &&
        // selectedLocations.length > 0 &&
        seedKeywords.length > 0) ||
      (activeTab === "website" &&
        // selectedLocations.length > 0 &&
        websiteURL.trim() !== "")
    ) {
      setLoading(true)
      try {
        const payload = {
          url: websiteURL,
          // language: 'english',
          search_by: activeTab,
          countries: selectedLocations,
          paid_user: true,
          all_locations: selectedLocations.length > 0 ? false : true,
          by_url: false,
          language: selectedLanguage.id || "english",
          // duration: duration,
          start_date: startMonthYear,
          end_date: endMonthYear,
        }
        if (activeTab === "keyword") {
          payload.seed_keywords = seedKeywords
        }
        const response = await axios.post(
          `${BASE_URL_WR}keyword-research/`,
          payload,
          //  {
          //   headers: {
          //     'Authorization': `Bearer ${access_token}`,
          //     'Content-Type': 'application/json',
          //   },
          // }
        )
        setSuggestedKeywords(response.data.data || [])
      } catch (error) {
        console.error("Error fetching suggested keywords:", error)
        if(error.response.data.error === "Invalid JSON response from API") toast.error("No keywords found. Please try with different inputs.")
      } finally {
        setLoading(false)
      }
    } else {
      toast.error("Please fill all the required fields")
    }
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLength, setSuggestionsLength] = useState(false)
  const [fetchingcont, setfetchingcont] = useState(false)
  useEffect(() => {
    setSuggestionsLength(suggestions.length > 0)
  }, [suggestions])
  const [selectedLocations, setSelectedLocations] = useState([])
  const inputRef = useRef(null)
  const [language, setlanguage] = useState([])

  useEffect(() => {
    if (searchTerm.trim().length >= 3) {
      const fetchSuggestions = async () => {
        try {
          setfetchingcont(true)
          const response = await axios.get(`${BASE_URL_WR}search-locations/?search_term=${searchTerm}`)
          setSuggestions(response.data.data || []) // Adjust based on API structure
        } catch (error) {
          console.error("Error fetching locations:", error)
        } finally {
          setfetchingcont(false)
        }
      }
      fetchSuggestions()
    } else {
      setSuggestions([])
    }
  }, [searchTerm])

  useEffect(() => {
    // if (searchTerm.trim().length >= 3) {
    const fetchSuggestions = async () => {
      try {
        // setfetchingcont(true);
        const response = await axios.get(`${BASE_URL_WR}get-languages/`)
        setlanguage(response.data || []) // Adjust based on API structure
      } catch (error) {
        console.error("Error fetching locations:", error)
      }
      // finally {
      //   setfetchingcont(false);
      // }
    }
    fetchSuggestions()
    //   } else {
    //     setSuggestions([]);
    //   }
    // },
  }, [searchTerm])

  const handleSelect = (country) => {
    if (!selectedLocations.some((location) => location.id === country.id)) {
      const updatedLocations = [...selectedLocations, country]
      setSelectedLocations(updatedLocations)
      setSearchTerm("")
      setSuggestions([])
      inputRef.current.focus()
    }
  }
  const [selectedLanguage, setselectedLanguage] = useState([])

  const handleSelectLanguage = (country) => {
    // if (!selectedLocations.some((location) => location.id === country.id)) {
    // const updatedLocations = [...se, country];
    setselectedLanguage(country)
    // setSearchTerm('');
    // setSuggestions([]);
    // inputRef.current.focus();
    // }
  }
  const handleInputChange = (e) => {
    setSearchTerm(e.target.value)
  }
  const handleRemoveLocation = (id) => {
    setSelectedLocations(selectedLocations.filter((location) => location.id !== id))
  }
  // const handleRemoveLocation = (id) => {
  //   setSelectedLocations(selectedLocations.filter(location => location.id !== id));
  // };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-white"
      onClick={() => setSuggestionsLength(false)}
    >
      {/* <h3 className="text-3xl md:text-4xl font-bold mb-6 md:text-start text-center text-blue">Keyword Suggestions</h3> */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg shadowop "
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="block text-lg font-medium text-homeblack">Discover new keywords.</h2>
          </div>
          <div className="border-b mb-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab("keyword")}
                className={`pb-4 px-1 relative font-medium ${activeTab === "keyword" ? "text-purple border-b border-purple " : "text-homeblack"}`}
              >
                Start with keywords
                {activeTab === "keyword" && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue1 " />
                )}
              </button>
              <button
                onClick={() => setActiveTab("website")}
                className={`pb-4 px-1 relative font-medium ${activeTab === "website" ? "text-purple border-b border-purple " : "text-homeblack"}`}
              >
                Start with a website
                {activeTab === "website" && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue1 " />
                )}
              </button>
            </div>
          </div>
          {activeTab === "keyword" ? (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-homeblack mb-2">
                  Enter products or services closely related to your business and press enter{" "}
                  <MdStar className="text-red" />
                </label>
                <div className="min-h-[40px] p-3 border rounded-md border mb-3">
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {seedKeywords &&
                        seedKeywords.map((keyword, index) => (
                          <motion.div
                            key={keyword}
                            className="flex items-center px-3 py-1 bg-[#bbd9f7] rounded-full text-sm font-medium text-pink"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                          >
                            {keyword}
                            <button className="ml-2 hover:text-red" onClick={() => removeKeyword(keyword)}>
                              ×
                            </button>
                          </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Input field inside the container but separate from keywords */}
                    <input
                      type="text"
                      placeholder={
                        seedKeywords.length === 0 ? 'Try "meal delivery" or "leather boots"' : "Add another keyword..."
                      }
                      className="flex-1 min-w-[200px] bg-transparent border-none outline-none"
                      value={inputValue}
                      onChange={handleKeyInputChange}
                      onKeyUp={handleInputKeyPress}
                      onPaste={handlePaste}
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-homeblack">
                  Be concise. Use specific terms like meal delivery, not meals.
                  <span className="font-bold"> Separate keywords with Commas or press Enter</span>.
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-homeblack mb-2">
                  Enter a site to filter unrelated keywords
                </label>
                <input
                  type="text"
                  placeholder="https://"
                  className="w-full px-3 py-2 border rounded-md outline-none border   "
                  value={websiteURL}
                  onChange={(e) => setWebsiteURL(e.target.value)}
                />
                <p className="mt-2 text-sm text-homeblack">
                  Using your site will filter out services, products or brands that you dont offer
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-homeblack mb-2">
                  Enter a website or a page to find keywords that match your site <MdStar className=" text-red-500" />
                </label>
                <input
                  type="text"
                  placeholder="https://"
                  className="w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-blue "
                  value={websiteURL}
                  onChange={(e) => setWebsiteURL(e.target.value)}
                />
                <p className="mt-2 text-sm text-homeblack">Use a website as a source of keywords</p>
              </div>
            </div>
          )}

          <div className=" w-full">
            <motion.div
              className="flex flex-row gap-6 w-full"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.2,
                    delayChildren: 0.5,
                  },
                },
              }}
            >
              {/* Locations */}
              <motion.div className="mt-7 bg-white p-6 rounded-lg shadow-md max-w-md w-full animate-fadeIn">
                <div className="flex items-center gap-4 text-sm text-gray-700 mb-4">
                  <span className="w-6 h-6  text-white rounded-full flex items-center justify-center">
                    📍
                  </span>
                  <span className="font-semibold">Select location</span>
                  <MdStar className="text-red-500" />
                </div>
                <div className="relative w-full">
                  <div className="flex gap-2 items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Type a location name.. (default all locations selected)"
                      value={searchTerm}
                      onChange={handleInputChange}
                      className="w-full border rounded-md px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue"
                    />
                    {fetchingcont && <Spin />}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedLocations.map((location) => (
                      <span
                        key={location.id}
                        className="bg-brand-blue1 text-white px-3 py-1 rounded-full text-sm flex items-center"
                      >
                        {location.name}
                        <button
                          onClick={() => handleRemoveLocation(location.id)}
                          className="ml-2 text-pink hover:text-red"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {suggestionsLength && (
                    <ul className="absolute z-10 mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto w-full">
                      {suggestions.map((country) => (
                        <li
                          key={country.id}
                          onClick={() => handleSelect(country)}
                          className={`px-4 py-2 cursor-pointer hover:bg-brand-blue1 hover:text-pink ${selectedLocations.some((location) => location.id === country.id) ? "bg-brand-blue1 text-pink" : ""}`}
                        >
                          {country.name} ({country.country_code})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>

              {/* Language Selection */}
              <motion.div className="mt-6 bg-white p-6 rounded-lg shadow-md max-w-md w-full animate-fadeIn">
                <div className="flex items-center gap-4 text-sm text-gray-700 mb-4">
                  <span className="w-6 h-6  text-white rounded-full flex items-center justify-center">
                    🌍
                  </span>
                  <span className="font-semibold">English (default)</span>
                </div>
                <div className="relative w-full">
                  <div className="flex gap-2 items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Type a language name..."
                      value={selectedLanguage.name}
                      onClick={() => setshowlanguage(true)}
                      className="w-full border rounded-md px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue"
                    />
                    {fetchingcont && <Spin />}
                  </div>
                  {language.length > 0 && showlanguage && (
                    <ul className="absolute z-10 mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto w-full">
                      {language.map((lang) => (
                        <li
                          key={lang.id}
                          onClick={() => {
                            handleSelectLanguage(lang)
                            setshowlanguage(false)
                          }}
                          className="px-4 py-2 cursor-pointer hover:bg-brand-blue1 hover:text-pink"
                        >
                          {lang.name} ({lang.code})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>

              {/* Duration Picker */}
              <motion.div className="mt-6 bg-white p-6 rounded-lg shadow-md max-w-md w-full animate-fadeIn">
                <div className="flex items-center gap-4 text-sm text-gray-700 mb-4">
                  <span className="w-6 h-6  text-white rounded-full flex items-center justify-center">
                    📅
                  </span>
                  <span className="font-semibold">Select Duration</span>
                  <MdStar className="text-red-500" />
                </div>
                <div className="relative w-full">
                  <Select defaultValue="3months" style={{ width: "100%" }} onChange={handleChangeDuration}>
                    <Option value="3months">3 Months</Option>
                    <Option value="6months">6 Months</Option>
                    <Option value="1year">1 Year</Option>
                  </Select>
                </div>
              </motion.div>

              {/* Date Picker */}
              <motion.div className="mt-6 bg-white p-6 rounded-lg shadow-md max-w-md w-full animate-fadeIn">
                <div className="flex items-center gap-4 text-sm text-gray-700 mb-4">
                  <span className="w-6 h-6  text-white rounded-full flex items-center justify-center">
                    📅
                  </span>
                  <span className="font-semibold">Select Date Range</span>
                  <MdStar className="text-red-500" />
                </div>
                <div className="relative w-full">
                  <Space direction="vertical" size={12}>
                    <RangePicker
                      // defaultValue={[dayjs("2015/01/01", dateFormat), dayjs("2015/01/01", dateFormat)]}
                      value={selectedDates}
                      format={dateFormat}
                      onChange={handleDateChange}
                    />
                  </Space>
                </div>
              </motion.div>
            </motion.div>
          </div>
           <div className="mt-6 flex flex-col gap-4">
  {/* Get Results Button - Always visible at the top */}
  <button
    onClick={handleGetResults}
    className="px-8 py-2 h-fit bg-brand-blue1 text-white rounded-lg flex items-center justify-center gap-2 hover:scale-105 smooth3 transition-colors w-1/6"
  >
    {loading ? "Getting results..." : "Get results"}
  </button>
  </div>
 <div className="mt-16 flex flex-col gap-4">
  {/* Filters and Tools - Only visible when there are results */}
  {suggestedKeywords?.length > 0 && (
    <div className="flex flex-col gap-4 w-full">
      {/* Filters Section */}
      <div className="flex items-center gap-4">
        {/* Active Filters Display */}
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <div
              key={filter.column}
              className="flex items-center bg-brand-blue1 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {filter.display}
              <button
                onClick={() => removeFilter(filter.column)}
                className="ml-3 text-lg text-pink hover:text-red"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={() => setFieldSelectorVisible(true)} 
            className="flex items-center gap-2"
          >
            <FilterOutlined />
            Add filter
          </Button>

          {activeFilters.length > 0 && (
            <Button
              onClick={handleClearAllFilters}
              className="flex items-center gap-2 text-gray-600"
              type="text"
            >
              🗑️ Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Tools Section */}
      <div className="flex justify-end gap-4 items-center">
        {/* Column Visibility Selector */}
        <div className="flex-1 max-w-md">
          <div className="flex flex-col gap-1">
            <label htmlFor="select_services">Fields To Hide</label>
            <Select
              mode="multiple"
              placeholder="Select columns to Hide"
              onChange={handleServiceChange}
              value={selectedServices}
              options={allOptions}
              maxTagCount="responsive"
              className="w-full"
            />
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="px-8 py-2 sm:mt-4 h-fit bg-white border border-pink text-pink rounded-lg flex items-center justify-center gap-2 hover:scale-105 smooth3 transition-colors whitespace-nowrap"
        >
          Download Report
        </button>
      </div>
    </div>
  )}
</div>
        </div>
        {loading && (
          <div className="flex w-full my-2">
            <Spin className="w-full flex justify-center items-center my-4  " />
          </div>
        )}
        {suggestedKeywords?.length > 0 && (
          <div className=" relative overflow-x-auto">
            <Table
              columns={columns.filter((column) => column.dataIndex === "keyword" || columnVisibility[column.dataIndex])}
              dataSource={filterData(sortedKeywords)}
              loading={loading}
              rowKey={(record, index) => index}
              showSorterTooltip={{ target: "sorter-icon" }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: filterData(sortedKeywords)?.length,
                showSizeChanger: true,
                onChange: (page, size) => {
                  setCurrentPage(page)
                  setPageSize(size)
                },
              }}
              scroll={{ x: "100%" }}
            />
          </div>
        )}
        {/* </div> */}
      </motion.div>
      {!suggestedKeywords.length > 0 && (
        <div className="flex flex-col md:flex-row w-full  justify-between px-4 md:px-8 lg:px-16 py-12 mx-auto text-homeblack">
          {/* Left Section */}
          <div className="w-full md:w-[50%] flex flex-col items-start gap-8 ">
            {/* Heading and Description */}
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-semibold leading-tight ">Find the Best Keywords for Your Strategy </h3>
              <p className="text-base  leading-relaxed">
                Enter a domain or seed keyword to discover actionable keyword ideas with volume, competition, and
                relevance insights.{" "}
              </p>
            </div>
            {/* Benefits Section */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold ">Benefits:</h3>
              <ul className="flex flex-col gap-2 ">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full " />
                  Expand Your Reach: Target keywords with high traffic potential.{" "}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full " />
                  Data-Driven Choices: Focus on low-competition, high-impact terms.{" "}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full " />
                  Boost Engagement: Create content that resonates with your audience.{" "}
                </li>
              </ul>
            </div>
            {/* Try it now section */}
            <div className="flex flex-col gap-2">
              <span className="text-[#0096FF] font-medium">Try it now!</span>
              <span className="text-sm ">Enter in the feilds above to see the results.</span>
            </div>
          </div>
          <div className="w-full md:w-[50%] flex items-center mt-8 md:mt-0 -z-0">
            <div className="relative w-full max-w-[700px] aspect-[4/3]">
              <Image
                src={"/images/Group 1000005710.svg"}
                alt="Post"
                height={10000}
                width={100000}
                className="scale-125"
              />
            </div>
          </div>
        </div>
      )}
      <Modal
        open={fieldSelectorVisible}
        onCancel={() => {
          setFieldSelectorVisible(false)
          setFieldSearchTerm("")
        }}
        footer={null}
        width={360}
        title="Add filter"
      >
        {renderFieldSelectorModal()}
      </Modal>

      <Modal open={filterVisible} onCancel={() => setFilterVisible(false)} footer={null} width={400}>
        {renderFilterModalContent()}
      </Modal>
    </motion.div>
  )
}
