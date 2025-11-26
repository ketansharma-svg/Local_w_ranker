"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { message, Popover } from "antd"
import { BASE_URL_WR } from "@/src/util/api"
interface Location {
    id: string
    name: string
}
interface Language {
    id: string
    name: string
}
interface Result {
    keyword: string
    rank: number
}
interface ResultsData {
    status: boolean
    data: {
        results: Result[]
    }
    error: string | null
    status_code: number
}
export default function KeywordRankChecker() {
    const [domain, setDomain] = useState("")
    const [locations, setLocations] = useState<Location[]>([])

    const [languages, setLanguages] = useState<Language[]>([])

    const [selectedLocation, setSelectedLocation] = useState<any>("")
    const [selectedLanguage, setSelectedLanguage] = useState<any>("")
    const [results, setResults] = useState<any>([])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [keywords, setKeywords] = useState<string[]>([])
    const [keywordInput, setKeywordInput] = useState("")

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [locationsRes, languagesRes] = await Promise.all([
                    fetch(`${BASE_URL_WR}locations/`),
                    fetch(`${BASE_URL_WR}languages/`),
                ])

                if (!locationsRes.ok || !languagesRes.ok) {
                    throw new Error("Failed to fetch data")
                }

                const [locationsData, languagesData] = await Promise.all([locationsRes.json(), languagesRes.json()])

                setLocations(locationsData)
                setLanguages(languagesData)
            } catch (err) {
                setError("Failed to load locations and languages")
            }
        }

        fetchData()
    }, [])

    const handleKeywordSubmit = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && keywordInput.trim()) {
                if (keywords.length >= 1) {
                    message.warning("You can only add one keyword at a time"); 
                    return; 
                }
                
                setKeywords((prevKeywords) => {
                    if (!prevKeywords.includes(keywordInput.trim())) {
                        return [...prevKeywords, keywordInput.trim()]
                    }
                    return prevKeywords
                })
                setKeywordInput("")
            }
        },
        [keywordInput, keywords], 
    )
    const handlePaste = useCallback(
        (e: React.ClipboardEvent) => {
            e.preventDefault()
            if (keywords.length >= 1) {
                message.warning("You can only have one keyword at a time");
                return;
            }
            
            const pastedText = e.clipboardData.getData("text")
            const newKeywords = pastedText
                .split(/[,\n]/)
                .map((k) => k.trim())
                .filter((k) => k && !keywords.includes(k))
            if (newKeywords.length > 0) {
                setKeywords([newKeywords[0]]) 
                message.info("Only the first keyword from your paste was added");
            }
            setKeywordInput("")
        },
        [keywords],
    )
    const removeKeyword = useCallback((keywordToRemove: string) => {
        setKeywords((prevKeywords) => prevKeywords.filter((k) => k !== keywordToRemove))
    }, [])
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!domain) {
            setError("Please enter a domain")
            return
        }
        if (keywords.length === 0) {
            setError("Please enter at least one keyword")
            return
        }
        setLoading(true)
        setError("")
        try {
            const res = await fetch(`${BASE_URL_WR}fetch-rank/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    domain,
                    location: selectedLocation,
                    language: selectedLanguage,
                    keywords,
                }),
            })
            if (!res.ok) {
                throw new Error("Failed to fetch rank data")
            }
            const data = await res.json()
            if (data.error) {
                throw new Error(data.error)
            }
            setResults(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch rank data")
        } finally {
            setLoading(false)
        }
    }
    const ResultsDisplay = ({ results }: { results: ResultsData }) => {
    if (!results || !results.data || !results.data.results || results.data.results.length === 0) {
        return null;
    }
    if (!results.status || results.error) {
        return <div className="text-red-500">Error: {results.error || 'Unable to display results'}</div>;
    }
        const chartData = results.data.results.map((result) => ({
            name: result.keyword,
            rank: result.rank,
        }))
        const getRankDescription = (rank: number) =>
            rank === -1 ? "Not ranked for this keyword" : `Ranked at position ${rank}`
        return (
            <>
                <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Keyword
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Rank</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {results.data.results.map((result, index) => (
                                <motion.tr
                                    key={result.keyword}
                                    className="hover:bg-gray-50"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                        delay: index * 0.1,
                                        duration: 0.3,
                                    }}
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{result.keyword}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        <Popover content={getRankDescription(result.rank)} placement="top">
                                            <span
                                                className={`cursor-help px-2 py-1 rounded-lg font-medium text-base ${result.rank === -1 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                                                    }`}
                                            >
                                                {result.rank}
                                            </span>
                                        </Popover>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* <div className="mt-6">
                    <h3 className="text-md font-semibold text-gray-700 mb-3">Visual Representation of Ranks</h3>
                    <motion.div
                        className="flex items-end space-x-4"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ staggerChildren: 0.2 }}
                    >
                        {chartData.map((data, index) => (
                            <motion.div
                                key={data.name}
                                className="flex flex-col items-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div
                                    className={`w-8 ${data.rank === -1 ? "bg-red-300" : "bg-blue-500"}`}
                                    style={{
                                        height: `${data.rank === -1 ? 10 : 100 / data.rank}px`,
                                    }}
                                ></div>
                                <span className="text-sm mt-1">{data.name}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                </div> */}
            </>
        )
    }
    return (
        <div className="">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-lg shadow-lg p-6"
            >
                <div className="space-y-4">
                    <h1 className="block text-lg font-medium text-homeblack">
                        Enter your domain and keywords to check keyword rankings
                    </h1>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6 animate-slideUp mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="domain" className="block text-sm font-medium">
                                Domain
                            </label>
                            <input
                                id="domain"
                                type="text"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="example.com"
                                className="w-full px-4 py-2 border rounded-md transition-all duration-300 hover:border-blue focus:border-blue outline-none bg-lightblue focus:ring-1 focus:ring-blue"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">Keywords</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={keywordInput}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    onKeyDown={handleKeywordSubmit}
                                    onPaste={handlePaste}
                                    placeholder={keywords.length > 0 ? 
                                        "You can only check one keyword at a time" : 
                                        "Enter a keyword and press Enter"}
                                    className="w-full px-4 py-2 border rounded-md transition-all duration-300 hover:border-blue focus:border-blue outline-none bg-lightblue focus:ring-1 focus:ring-blue"
                                    disabled={keywords.length > 0} 
                                />
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <AnimatePresence>
                                        {keywords.map((keyword) => (
                                            <motion.div
                                                key={keyword}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-center gap-1 px-3 py-1 text-white bg-brand-blue1   text-brabg-brand-blue1   rounded-full text-sm"
                                            >
                                                <span>{keyword}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeKeyword(keyword)}
                                                    className="hover:text-red-600 transition-colors"
                                                >
                                                    ×
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="location" className="block text-sm font-medium">
                                Location
                            </label>
                            <select
                                id="location"
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md transition-all duration-300 hover:border-blue focus:border-blue outline-none bg-lightblue focus:ring-1 focus:ring-blue"
                            >
                                <option value="">Select location...</option>
                                {locations.map((location: any) => (
                                    <option key={location.id} value={location.code}>
                                        {location.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="language" className="block text-sm font-medium">
                                Language
                            </label>
                            <select
                                id="language"
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md transition-all duration-300 hover:border-blue focus:border-blue outline-none bg-lightblue focus:ring-1 focus:ring-blue"
                            >
                                <option value="">Select language...</option>
                                {languages.map((language: any) => (
                                    <option key={language.id} value={language.code}>
                                        {language.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {error && (
                        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm">
                            {error}
                        </motion.p>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full md:w-auto px-6 py-2 bg-brand-blue1   text-white rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg
                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Checking...
                            </span>
                        ) : (
                            "Check Rankings"
                        )}
                    </button>
                </form>
                {results && (
                    <ResultsDisplay results={results} />
                )}
            </motion.div>
            {!results &&
                <div className="flex flex-col md:flex-row w-full justify-between px-4 md:px-8 lg:px-16 py-12 mx-auto text-homeblack">
                    <div className="w-full md:w-[50%] flex flex-col items-start gap-8 ">
                        <div className="flex flex-col gap-4">
                            <h3 className="text-3xl font-semibold leading-tight ">Find the Best Keywords for Your Strategy </h3>
                            <p className="text-base leading-relaxed">
                                Enter a domain or seed keyword to discover actionable keyword ideas with volume, competition, and
                                relevance insights.
                            </p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg font-semibold ">Benefits:</h3>
                            <ul className="flex flex-col gap-2 ">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full " />
                                    Expand Your Reach: Target keywords with high traffic potential.
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full " />
                                    Data-Driven Choices: Focus on low-competition, high-impact terms.
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full " />
                                    Boost Engagement: Create content that resonates with your audience.
                                </li>
                            </ul>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-[#0096FF] font-medium">Try it now!</span>
                            <span className="text-sm ">Enter in the fields above to see the results.</span>
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
            }
        </div>
    )
}

