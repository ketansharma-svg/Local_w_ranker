'use client';

import { BASE_URL_WR } from '@/src/util/api';
import { Popover } from 'antd';
import axios from 'axios';
import { motion } from 'framer-motion';
import Cookies from 'js-cookie';
import { Loader2, Search } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { PiArrowBendLeftUpBold } from 'react-icons/pi';
export default function KeywordDensityChecker() {
    const [websiteURL, setWebsiteURL] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('densityurl');
            return saved ? JSON.parse(saved) : [];
        }
        return null;
    });
    const [loading, setLoading] = useState(false);
    const [oneWordPhrases, setOneWordPhrases] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('oneWordPhrases');
            return saved ? JSON.parse(saved) : null;
        }
        return [];
    });

    const [twoWordPhrases, setTwoWordPhrases] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('twoWordPhrases');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [threeWordPhrases, setThreeWordPhrases] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('threeWordPhrases');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    // UseEffect to save to sessionStorage when state updates
    useEffect(() => {
        if (oneWordPhrases?.length) {
            sessionStorage.setItem('oneWordPhrases', JSON.stringify(oneWordPhrases));
        }
        if (twoWordPhrases?.length) {
            sessionStorage.setItem('twoWordPhrases', JSON.stringify(twoWordPhrases));
        }
        if (threeWordPhrases?.length) {
            sessionStorage.setItem('threeWordPhrases', JSON.stringify(threeWordPhrases));
        }
        if (websiteURL) {
            sessionStorage.setItem('densityurl', JSON.stringify(websiteURL));
        }
    }, [oneWordPhrases, twoWordPhrases, threeWordPhrases, websiteURL]);


    const [seedKeywords, setSeedKeywords] = useState('');
    const [suggestedKeywords, setSuggestedKeywords] = useState([]);
    const [error, setError] = useState('');

    const handleFetchKeywordDensity = async () => {
        if (!websiteURL) {
            console.error('No URL provided');
            return;
        }
        const access_token = Cookies.get("login_access_token_wrank");

        setLoading(true);
        try {
            const response = await axios.post(
                `${BASE_URL_WR}keyword-density/`,
                { url: websiteURL },
                {
                    headers: {
                        // 'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            setOneWordPhrases(response.data.data.one_word_phrases || []);
            setTwoWordPhrases(response.data.data.two_word_phrases || []);
            setThreeWordPhrases(response.data.data.three_word_phrases || []);
        } catch (error) {
            console.error('Error fetching keyword density:', error);
        } finally {
            setLoading(false);
        }
    };
    const handleFetchSuggestedKeywords = async () => {
        // Ensure seedKeywords is defined
        if (!seedKeywords) {
            console.error('No seed keywords provided');
            return;
        }
        setLoading(true); // Set loading state
        try {
            // Make the POST request
            const response = await axios.post(`${BASE_URL_WR}/keyword-suggestions/`, {
                website_url: websiteURL, // Make sure to include the website URL here
                seed_keywords: seedKeywords
            });

            // Update state with the suggested keywords

            setSuggestedKeywords(response.data || []);
        } catch (error) {
            console.error('Error fetching suggested keywords:', error);
            // Optionally: set an error state to show an error message to the user
        } finally {
            setLoading(false); // Reset loading state
        }
    };

    const validateURL = (url) => {
        const urlRegex = new RegExp(
            "^(https?:\\/\\/)" +
            "((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*\\.)+[a-zA-Z]{2,}|" +
            "((\\d{1,3}\\.){3}\\d{1,3}))|" +
            "\\[([a-fA-F\\d:]+)\\])" +
            "(:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*" +
            "(\\?[;&a-zA-Z\\d%_.~+=-]*)?" +
            "(#[-a-zA-Z\\d_]*)?$",
            "i"
        );

        return urlRegex.test(url);
    };

    const handleChange = (e) => {
        const value = e.target.value;
        setWebsiteURL(value);
        if (value && !validateURL(value)) {
            setError('Please enter a valid URL starting with http:// or https://');
        } else {
            setError();
        }
    };

    return (
        <div className='space-y-10 xl:space-y-0 bg-white'>
            <div className=" ">
                <main >
                    <div className="w-full z-9 ">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white shadowop rounded-lg p-4 md:p-6 "
                        >
                            <div className="mb-6">
                                <label htmlFor="website-url" className="block text-lg font-medium text-gray-700 mb-2">
                                    Get a detailed keyword density report.
                                </label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        type="text"
                                        name="website-url"
                                        id="website-url"
                                        className="focus:ring-2 focus:ring-blue focus:border-blue outline-none bg-lightblue block w-full pl-4 pr-12 text-homeblack border-gray-300 rounded-md py-3 border"
                                        placeholder="https://example.com"
                                        value={websiteURL}
                                        onChange={handleChange}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                        <button
                                            onClick={handleFetchKeywordDensity}
                                            className="px-4 py-2 bg-brand-blue1   text-white rounded-md flex items-center gap-2 hover:bg-brandtext-brand-blue1 -600 transition-colors duration-300 disabled:bg-brand  -300 disabled:cursor-not-allowed"
                                            disabled={!websiteURL || error}
                                        >
                                            {loading ? (
                                                <Loader2 className="animate-spin h-5 w-5" />
                                            ) : (
                                                <Search className="h-5 w-5" />
                                            )}
                                            <span className="hidden sm:inline">Search</span>
                                        </button>
                                    </div>
                                </div>
                                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                                <p className=" flex gap-2 items-center"><span className="flex items-center text-blue gap-1 font-bold my-2"> <PiArrowBendLeftUpBold className="font-bold text-xl" /> Get started: </span> Enter a URL and click Search to uncover keyword density and improve SEO.</p>
                            </div>

                            {loading && (
                                <div className="flex justify-center items-center py-12">
                                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue"></div>
                                </div>
                            )}

                            {!loading && (oneWordPhrases?.length > 0 || twoWordPhrases?.length > 0 || threeWordPhrases?.length > 0) && (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                                        <ResultsTable title="One-Word Phrases" data={oneWordPhrases} />
                                        <ResultsTable title="Two-Word Phrases" data={twoWordPhrases} visible={twoWordPhrases?.length > 0 || threeWordPhrases?.length > 0} />
                                    </div>
                                    <div className="mt-6">
                                        <ResultsTable title="Three-Word Phrases" data={threeWordPhrases} visible={twoWordPhrases?.length > 0 || threeWordPhrases?.length > 0} />
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                </main>
            </div>


            {(oneWordPhrases?.length > 0 || twoWordPhrases?.length > 0 || threeWordPhrases?.length > 0) ? "" :

                <div className="flex flex-col md:flex-row w-full  justify-between px-4 md:px-8 lg:px-16 py-12 mx-auto text-homeblack">
                    {/* Left Section */}
                    <div className="w-full md:w-[50%] flex flex-col items-start gap-8 ">
                        {/* Heading and Description */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-3xl font-semibold leading-tight ">
                                Analyze Your Keywords
                            </h3>
                            <p className="text-base  leading-relaxed">
                                Enter a website URL to get keyword suggestions with frequency and density insights.
                            </p>
                        </div>

                        {/* Benefits Section */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg font-semibold ">Benefits:</h3>
                            <ul className="flex flex-col gap-2 ">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full " />
                                    Boost Visibility: Rank higher on search engines.
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full " />
                                    Target Audience: Optimize content for better engagement.
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full " />
                                    Actionable Insights: Improve your SEO strategy.
                                </li>
                            </ul>
                        </div>

                        {/* Try it now section */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[#0096FF] font-medium">Try it now!</span>
                            <span className="text-sm ">Enter a link above to see the results.</span>
                        </div>
                    </div>

                    {/* Right Section - Image */}
                    <div className="w-full md:w-[50%] flex items-center mt-8 md:mt-0 -z-0">
                        <div className="relative w-full max-w-[700px] aspect-[4/3]">
                            <Image
                                src="/images/Group 1000005708.svg"
                                width={1}
                                height={1}
                                className="w-full object-contain transform scale-125 "
                                alt="SEO Analysis Dashboard"
                                priority
                            />
                        </div>
                    </div>
                </div>

            }


        </div>
    )
}

function ResultsTable({ title, data, visible }) {
    return (
        <div className=''>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            <div className="overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 ">
                    <thead className="bg-lightbrand text-brand-blue1 ">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs 2xl:text-sm text-brand-blue1  font-medium  uppercase tracking-wider cursor-help">
                                Phrase
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs 2xl:text-sm text-brand-blue1  font-medium  uppercase tracking-wider cursor-help">
                                Frequency
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs 2xl:text-sm text-brand-blue1  font-medium  uppercase tracking-wider cursor-help">
                                Density (%)
                            </th>
                            {visible ?
                                <Popover
                                    placement="top"
                                    content={"Numbers represent search interest relative to the highest point on the chart for the given region and time. A value of 100 is the peak popularity for the term. A value of 50 means that the term is half as popular. A score of 0 means that there was not enough data for this term."}
                                    styles={{
                                        root: { maxWidth: 300 },
                                    }}                                >
                                    <th scope="col" className="px-6 py-3 text-center text-xs 2xl:text-sm text-brand-blue1  font-medium  uppercase tracking-wider cursor-help">
                                        Avg. Search Trend
                                    </th>
                                </Popover>
                                : ""}

                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((item, index) => (
                            <tr key={index} className="border-b hover:bg-lightblue smooth3">
                                <td className="px-6 py-4 whitespace-nowrap  text-sm font-medium text-gray-900">{item.phrase}</td>
                                <td className="px-6 py-4 text-center whitespace-nowrap  text-sm text-gray-500">{item.frequency}</td>
                                <td className="px-6 py-4 text-center whitespace-nowrap  text-sm text-gray-500">{item['density(%)']}%</td>
                                {visible ?
                                    <td className="px-6 py-4 text-center whitespace-nowrap  text-sm text-gray-500">{item.avg_search_trend ? item.avg_search_trend : "-"}</td>
                                    : ""}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
