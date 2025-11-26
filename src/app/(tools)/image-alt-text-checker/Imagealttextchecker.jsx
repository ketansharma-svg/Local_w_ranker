"use client"
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import Cookies from 'js-cookie';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { PiArrowBendLeftUpBold, PiImageBroken } from 'react-icons/pi';
import { toast } from 'sonner';

export default function Imagealttextchecker () {
    const [urls, setUrls] = useState('');
    const [responseData, setResponseData] = useState([]);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState("");
    const validateURL = (url) => {
    const urlRegex = new RegExp(
        "^(https?:\\/\\/)?" + // Protocol
        "((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*\\.)+[a-zA-Z]{2,}|" + // Domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))|" + // OR IPv4 address
        "\\[([a-fA-F\\d:]+)\\])" + // OR IPv6 address
        "(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*" + // Port and path
        "(\\?[;&a-zA-Z\\d%_.~+=-]*)?" + // Query string
        "(\\#[-a-zA-Z\\d_]*)?$", // Fragment locator
        "i"
    );
    return urlRegex.test(url);
    };
    const handleUrlChange = (value) => {
    setUrls(value);
      const urlList = value.split("\n").map((url) => url.trim()).filter((url) => url); // Split by lines and trim spaces.
      const invalidUrls = urlList.filter((url) => !validateURL(url)); // Validate each URL.
    if (invalidUrls.length > 0) {
        setError(
        `Invalid URLs:\n${invalidUrls.join(", ")}\nPlease ensure all URLs are valid.`
        );
    } else {
        setError("");
    }
    };
    // const handleUrlChange = (value) => {
    //     setUrls(value);
    // };
    const handleSubmit = async () => {
        const access_token = Cookies.get("login_access_token_wrank");
        setIsChecking(true);
        if (!urls) {
            toast.error("Please enter URLs");
            setIsChecking(false);
            return;
        }
        setResponseData([]);
        const urlArray = urls.split('\n').map(url => url.trim()).filter(url => url);
        for (let i = 0; i < urlArray.length; i++) {
            const url = urlArray[i];
            setResponseData(prev => [...prev, { url, status: 'loading' }]);
            try {
                const formData = new FormData();
                formData.append('url', url);
                const response = await axios.post(`https://dashboard.wranker.com/api/image-alt-checker/`, formData
                    //     , {
                    //     headers: {
                    //         'Content-Type': 'multipart/form-data',
                    //         'Authorization': `Bearer ${access_token}`,
                    //     },
                    // }
                );
                setResponseData(prev => {
                    const newData = [...prev];
                    newData[i] = {
                        url,
                        status: 'success',
                        ...response.data.result,
                    };
                    return newData;
                });
            } catch (error) {
                console.error('Error checking URL:', url, error);
                setResponseData(prev => {
                    const newData = [...prev];
                    newData[i] = {
                        url,
                        status: 'error',
                        error: 'Failed to check this URL',
                    };
                    return newData;
                });
            }
        }
        setIsChecking(false);
        toast.success("Image alt check completed!");
    };
    return (
        <div className="min-h-screen ">
            <main className=" ">
                <section className="mb-12">
                    {/* <h1 className="text-3xl md:text-4xl font-bold text-brand-blue1  mb-6 md:text-start text-center">Image Alt Text Checker</h1> */}
                    <div className="bg-white rounded-lg shadowop     p-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <label htmlFor="website-url" className="block text-lg font-medium text-gray-700 mb-2">
                                Optimize Your Images for Accessibility and SEO.                              </label>
                            <textarea
                                className="w-full h-40 p-2 text-black  border rounded focus:outline-none focus:ring-2 focus:ring-blue"
                                placeholder="Enter URLs (one per line)"
                                value={urls}
                                onChange={(e) => handleUrlChange(e.target.value)}
                            />
                        </motion.div>
                        <p className='text-xs font-semibold text-brand-blue1  flex items-center gap-2'><PiArrowBendLeftUpBold className="font-bold text-xl" />Enter URLs (one per line)</p>
                        {error && <p className="mt-2 text-sm text-red-600 whitespace-pre-line">{error}</p>}
                        <button
                            onClick={handleSubmit}
                            disabled={isChecking || !urls || error}
                            className="px-8 py-2 bg-brand-blue1 text-white rounded-lg flex items-center gap-2 hover:scale-105 smooth3 transition-colors mt-2 disabled:cursor-not-allowed"
                        >
                            {isChecking ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                'Check Images'
                            )}
                        </button>
                    </div>
                </section>
                {!responseData.length > 0 && (
                    <div className="flex flex-col md:flex-row w-full  justify-between px-4 md:px-8 lg:px-16 py-12 mx-auto text-black">
                        {/* Left Section */}
                        <div className="w-full md:w-[50%] flex flex-col items-start gap-8 ">
                            {/* Heading and Description */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-3xl font-semibold leading-tight ">
                                    Enhance Image Accessibility and  SEO
                                </h3>
                                <p className="text-base  leading-relaxed">
                                    Enter a webpage URL to analyze alt text and optimize it for better  accessibility and search engine rankings.
                                </p>
                            </div>
                            {/* Benefits Section */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-lg font-semibold ">Benefits:</h3>
                                <ul className="flex flex-col gap-2 ">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full"/>
                                        Improve Usability: Make content accessible to all users.</li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full"/>
                                        Boost Rankings: Help search engines understand your images.  </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full"/>
                                        SEO Compliance: Ensure alt text meets best practices.</li>
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
                                    src="/images/Group 1000005727.svg"
                                    width={1}
                                    height={1}
                                    className="w-full object-contain transform scale-125 "
                                    alt="SEO Analysis Dashboard"
                                    priority
                                />
                            </div>
                        </div>
                    </div>
                )}
                <AnimatePresence>
                    {responseData.length > 0 && (
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto"
                        >
                            <h2 className="text-2xl font-bold mb-4 text-brand-blue1 ">Results</h2>
                            {responseData.map((data, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.2 }}
                                    className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <a
                                            href={data.url}
                                            className="text-lg font-semibold text-brand-blue1 ">{data.url}</a>
                                        {data.status === 'loading' && (
                                            <Loader2 className="animate-spin h-5 w-5 text-brand-blue1 " />
                                        )}
                                        {data.status === 'success' && (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        )}
                                        {data.status === 'error' && (
                                            <AlertCircle className="h-5 w-5 text-red-500" />
                                        )}
                                    </div>
                                    {data.status === 'loading' && (
                                        <p className="text-sm text-gray-500">Checking images...</p>
                                    )}
                                    {data.status === 'error' && (
                                        <p className="text-sm text-red-500">{data.error}</p>
                                    )}
                                    {data.status === 'success' && (
                                        <>
                                            <div className="flex items-center mb-2 text-black">
                                                <span className="font-medium text-black">Total Images: {data.count}</span>
                                            </div>
                                            <div className="flex items-center mb-2 text-black">
                                                <span className="font-medium text-black">Images Missing Alt: {data.missing}</span>
                                            </div>
                                            {data.images_list && data.images_list.length > 0 && (
                                                <div>
                                                    <div className="max-h-125 overflow-y-auto">
                                                        <table className="min-w-full divide-y divide-gray-200 table-fixed ">
                                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                                <tr className="flex w-full">
                                                                    <th
                                                                        scope="col"
                                                                        className="px-6 py-3 text-left text-base font-bold text-black uppercase tracking-wider w-1/5 break-words"
                                                                    >
                                                                        Image Preview
                                                                    </th>
                                                                    <th
                                                                        scope="col"
                                                                        className="px-6 py-3 text-left text-base font-bold text-black uppercase tracking-wider w-3/5 break-words"
                                                                    >
                                                                        Image URL
                                                                    </th>
                                                                    <th
                                                                        scope="col"
                                                                        className="px-6 py-3 text-left text-base font-bold text-black uppercase tracking-wider w-1/5 break-words"
                                                                    >
                                                                        Alt Text
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200 overflow-hidden">
                                                                {data.images_list.map((imageObj, imgIndex) => {
                                                                    const [imagePath, altText] = Object.entries(imageObj)[0];
                                                                    const updatedImagePath = imagePath.startsWith('/') ? `${data.url}${imagePath.slice(1)}` : imagePath;
                                                                    const isValidSrc = updatedImagePath.startsWith('http')
                                                                    return (
                                                                        <tr key={imgIndex} className="flex w-full overflow-hidden">
                                                                            <td className="px-6 py-4 whitespace-normal break-words  w-1/5 overflow-hidden text-sm text-black">
                                                                                {isValidSrc ? (
                                                                                    <Image
                                                                                        src={updatedImagePath}
                                                                                        alt={altText || "Image preview"}
                                                                                        className="h-16 w-16 object-contain rounded"
                                                                                        width={100}
                                                                                        height={100}
                                                                                    />
                                                                                ) : (
                                                                                    <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-xs">
                                                                                        <PiImageBroken className='text-3xl' />
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-normal break-words  w-3/5 overflow-hidden text-sm text-black">
                                                                                <a
                                                                                    href={updatedImagePath}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                     className="text-brand-blue1 -500 underline break-all word-break-all whitespace-normal"
                                                                                    style={{ wordBreak: "break-all", overflowWrap: "break-word" }}
                                                                                >
                                                                                    {updatedImagePath}
                                                                                </a>
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-normal break-words  w-1/5 overflow-hidden text-sm text-black">
                                                                                {altText ? (
                                                                                    <span className="text-green-500">{altText}</span>
                                                                                ) : (
                                                                                    <span className="text-red-500">Missing alt text</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                            {data.images_list && data.images_list.length === 0 && (
                                                <p className="text-sm text-green-500">No images found on this page.</p>
                                            )}
                                        </>
                                    )}

                                </motion.div>

                            ))}

                        </motion.section>
                    )}
                </AnimatePresence>

            </main>

        </div>
    );
}

