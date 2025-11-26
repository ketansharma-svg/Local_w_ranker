"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import Image from "next/image"
import { PiArrowBendLeftUpBold } from "react-icons/pi"
import { BASE_URL_WR } from "@/src/util/api"

// API endpoint for screenshots
const APIFLASH_ACCESS_KEY = "05fd8c021f124d298bd3c4577d0e48aa"

// Patterns to look for in the content
const dummyContentPatterns = [
  /lorem\s+ipsum/i,
  /dummy\s+text/i,
  /placeholder/i,
  /test\s+image/i,
  /test\s+description/i,
  /coming\s+soon/i,
  /under\s+construction/i,
]
interface ContentMatch {
  pattern: string
  htmlTag: string
  content: string
}

export default function DummyContentChecker() {
  const [url, setUrl] = useState("")
  const [results, setResults] = useState<{
    found: boolean
    matches: ContentMatch[]
  } | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
  }

  const checkDummyContent = async () => {
    if (!url) {
        toast.error("Please enter a valid URL.", { position: "bottom-right" });
        return;
    }
    
    const data = { url: url };
    setLoading(true);
    
    try {
        // 1. Fetch the HTML content directly using a server-side proxy
        const proxyUrl = `${BASE_URL_WR}dummy-content/`;
        const contentResponse = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        
        if (!contentResponse.ok) {
            throw new Error(`Failed to fetch HTML content: ${contentResponse}`);
        }
        
        const htmlContent = await contentResponse.text();
        
        // 2. Parse the HTML content
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");
        
        // 3. Find and remove dummy content in the HTML
        const matches:any = [];
        
        const checkNode = (node:any) => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                const text = node.textContent.trim();
                if (text.length > 0) {
                    for (const pattern of dummyContentPatterns) {
                        if (pattern.test(text)) {
                            const parentElement = node.parentElement;
                            if (parentElement) {
                                // Limit the HTML tag length to avoid overwhelming the UI
                                const htmlTag = parentElement.outerHTML.length > 500
                                    ? parentElement.outerHTML.substring(0, 500) + "..."
                                    : parentElement.outerHTML;

                                matches.push({
                                    pattern: pattern.toString().replace(/\//g, "").replace(/i$/, ""),
                                    htmlTag: htmlTag,
                                    content: text,
                                });

                                // Remove the matched text node
                                parentElement.removeChild(node);
                                break; // Exit the loop to avoid checking the same node again
                            }
                        }
                    }
                }
            }
            // Check child nodes
            node.childNodes.forEach(checkNode);
        };
        checkNode(doc.body);
        // 4. Generate screenshot
        const screenshotResponse = await fetch(
            `https://api.apiflash.com/v1/urltoimage?access_key=${APIFLASH_ACCESS_KEY}&url=${encodeURIComponent(url)}&full_page=true&format=jpeg`,
        );
        if (!screenshotResponse.ok) {
            throw new Error(`Failed to generate screenshot: ${screenshotResponse.statusText}`);
        }
        const screenshotBlob = await screenshotResponse.blob();
        const screenshotUrl = URL.createObjectURL(screenshotBlob);
        setScreenshotUrl(screenshotUrl);
        
        // 5. Set results
        setResults({
            found: matches.length > 0,
            matches,
        });
        
        toast.success(`Dummy content check completed. Found: ${matches.length} instances.`, { position: "bottom-right" });
    } catch (error:any) {
        console.error("Error fetching URL:", error);
        toast.error(`Error: ${error.message}`, { position: "bottom-right" });
    } finally {
        setLoading(false);
    }
};
  return (
    <div className="text-white">
      <div className="min-h-screen">
        <motion.div
          className="bg-white rounded-lg shadowop p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <label htmlFor="website-url" className="block text-lg font-medium text-gray-700 mb-2">
            Detect and Eliminate Dummy Content
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={url}
              onChange={handleInputChange}
              placeholder="http://example.com"
              className="w-2/3 p-3 rounded text-gray-800 outline-none focus:outline-none focus:ring-2 focus:ring-brantext-brand-blue1 bg-lightblue border"
            />
            <motion.button
              className={`px-8 py-2 bg-brand-blue1 text-white h-full rounded-lg flex items-center gap-2 hover:scale-105 smooth3 transition-colors ${loading ? "opacity-50 cursor-not-allowed" : "transition-colors"}`}
              onClick={checkDummyContent}
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? (
                <motion.div
                  className="inline-block"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                >
                  ⟳
                </motion.div>
              ) : (
                "Check Content"
              )}
            </motion.button>
          </div>
          <p className="flex gap-2 items-center text-homegrey">
            <span className="flex items-center text-brand-blue1 gap-1 font-bold my-2">
              <PiArrowBendLeftUpBold className="font-bold text-xl" /> Get started:
            </span>
            Paste your text or URL to identify dummy content and ensure your site is polished and professional.
          </p>
        </motion.div>
        {!results && !screenshotUrl && (
          <div className="flex flex-col md:flex-row w-full justify-between px-4 md:px-8 lg:px-16 py-12 mx-auto text-black">
            {/* Left Section */}
            <div className="w-full md:w-[50%] flex flex-col items-start gap-8">
              {/* Heading and Description */}
              <div className="flex flex-col gap-4">
                <h3 className="text-3xl font-semibold leading-tight">Eliminate Placeholder Content Effortlessly</h3>
                <p className="text-base leading-relaxed">
                  Enter text or a URL to detect dummy content and ensure your site looks professional and complete.
                </p>
              </div>
              {/* Benefits Section */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">Benefits:</h3>
                <ul className="flex flex-col gap-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brantext-brand-blue1" />
                    Enhance Professionalism: Remove filler text and polish your content.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brantext-brand-blue1" />
                    Improve Credibility: Present a finalized, error-free website.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brantext-brand-blue1" />
                    Streamline Content Review: Identify gaps and make edits quickly.
                  </li>
                </ul>
              </div>
              {/* Try it now section */}
              <div className="flex flex-col gap-2">
                <span className="text-[#0096FF] font-medium">Try it now!</span>
                <span className="text-sm">Enter a link above to see the results.</span>
              </div>
            </div>

            {/* Right Section - Image */}
            <div className="w-full md:w-[50%] flex items-center mt-8 md:mt-0 -z-0">
              <div className="relative w-full max-w-[700px] aspect-[4/3]">
                <Image
                  src="/images/Group 1000005720.svg"
                  width={1}
                  height={1}
                  className="w-full object-contain transform scale-125"
                  alt="SEO Analysis Dashboard"
                  priority
                />
              </div>
            </div>
          </div>
        )}

        {results && (
          <motion.div
            className="bg-white rounded-lg shadow-lg p-6 mb-8 text-gray-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-4 text-brand-blue1">Results</h2>

            {/* Dummy content info */}
            <p className="mb-4">
              {results.found
                ? `Found ${results.matches.length} instances of dummy content!`
                : "No dummy content found."}
            </p>

            {/* Display HTML tags with dummy content */}
            {results.found && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-4">HTML Tags with Dummy Content:</h3>
                <div className="space-y-4">
                  {results.matches.map((match, index) => (
                    <div key={index} className="border p-4 rounded-lg ">
                      <p className="font-medium mb-2">
                        Match #{index + 1} - Pattern: {match.pattern}
                      </p>
                      <div className="mb-2">
                        <p className="font-medium text-sm text-gray-600 my-2">Content:</p>
                        <p className="bg-gray-100 p-2 rounded">{match.content}</p>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-600 my-2">HTML Tag:</p>
                        <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-sm">{match.htmlTag}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* {screenshotUrl && (
          <motion.div
            className="bg-white rounded-lg shadow-lg p-6 mb-8 text-gray-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl font-bold mb-4 text-brand-blue1">Website Screenshot:</h3>
            <img
              src={screenshotUrl || "/placeholder.svg"}
              alt="Screenshot"
              width={800}
              height={600}
              className="w-full h-auto border rounded"
            />
          </motion.div>
        )} */}
      </div>
    </div>
  )
}









// "use client";

// import React, { useState } from 'react';
// import { motion } from 'framer-motion';
// import { toast } from 'sonner';
// import Image from 'next/image';
// import { PiArrowBendLeftUpBold } from 'react-icons/pi';
// // Replace these with your own API keys
// const DIFFBOT_API_TOKEN = 'd14b1a743a164eedb13685e715b403b9';
// const IMAGGA_API_KEY = 'acc_623019daf1a57ab';
// const IMAGGA_API_SECRET = 'f5977b00aa8de6c7769fee8cbbedbf08';
// const APIFLASH_ACCESS_KEY = '05fd8c021f124d298bd3c4577d0e48aa';

// const dummyContentPatterns = [
//     /lorem\s+ipsum/i,
//     /dummy\s+text/i,
//     /placeholder/i,
// ];

// export default function DummyContentChecker() {
//     const [url, setUrl] = useState('');
//     const [results, setResults] = useState<any>();
//     const [screenshotUrl, setScreenshotUrl] = useState('');
//     const [loading, setLoading] = useState(false);

//     const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setUrl(e.target.value);
//     };

//     const checkDummyContent = async () => {
//         if (!url) {
//             toast.error('Please enter a valid URL.', { position: "bottom-right" });
//             return;
//         }

//         setLoading(true);
//         try {
//             // 1. Diffbot API - Extract text, sentiment, and images
//             const diffbotResponse = await fetch(`https://api.diffbot.com/v3/article?token=${DIFFBOT_API_TOKEN}&url=${url}`);
//             if (!diffbotResponse.ok) {
//                 throw new Error('Network response was not ok');
//             }
//             const diffbotData: any = await diffbotResponse.json();
//             const article = diffbotData.objects?.[0];
//             if (!article) {
//                 throw new Error('No content found for this URL.');
//             }

//             const text = article?.text || '';
//             const sentiment = article?.sentiment || 'neutral';
//             const images = article?.images || [];

//             let foundCount = 0;
//             for (const pattern of dummyContentPatterns) {
//                 const matches = text.match(pattern);
//                 if (matches) {
//                     foundCount += matches.length;
//                 }
//             }

//             // 2. Imagga API - Check alt text for images
//             // New part for image metadata and handling more tags
//             const imageAltTexts = await Promise.all(
//                 images.map(async (img: any) => {
//                     const altResponse = await fetch(`https://api.imagga.com/v2/tags?image_url=${encodeURIComponent(img.url)}`, {
//                         headers: {
//                             'Authorization': `Basic ${btoa(`${IMAGGA_API_KEY}:${IMAGGA_API_SECRET}`)}`,
//                         },
//                     });

//                     const altData: any = await altResponse.json();

//                     const tags = altData.result?.tags || [];
//                     const altText = tags.length > 0 ? tags[0].tag.en : 'No alt text provided';
//                     const allTags = tags.map((tag: any) => tag.tag.en).join(', '); // Displaying all tags

//                     return {
//                         url: img.url,
//                         alt: altText,
//                         tags: allTags,  // Include all tags
//                         width: img.width || 'N/A',
//                         height: img.height || 'N/A',
//                         size: img.bytes ? `${(img.bytes / 1024).toFixed(2)} KB` : 'N/A', // Show file size if available
//                     };
//                 })
//             );

//             // Extend results object
//             setResults({
//                 found: foundCount > 0,
//                 count: foundCount,
//                 sentiment,
//                 sentimentScore: article?.sentimentScore,  // Adding sentiment score
//                 summary: article?.summary || 'No summary available',  // Adding article summary
//                 author: article?.author || 'Unknown author', // Add author
//                 images: images.map((img: any, index: number) => ({
//                     ...img,
//                     alt: imageAltTexts[index]?.alt || 'No alt text',
//                     tags: imageAltTexts[index]?.tags,  // Include all tags in the response
//                     width: imageAltTexts[index]?.width,
//                     height: imageAltTexts[index]?.height,
//                     size: imageAltTexts[index]?.size,
//                 })),
//             });


//             // 3. APIFLASH API - Generate screenshot
//             const screenshotResponse = await fetch(
//                 `https://api.apiflash.com/v1/urltoimage?access_key=${APIFLASH_ACCESS_KEY}&url=${encodeURIComponent(url)}&full_page=true&format=jpeg`
//             );
//             const screenshotBlob = await screenshotResponse.blob();
//             const screenshotUrl = URL.createObjectURL(screenshotBlob);
//             setScreenshotUrl(screenshotUrl);

//             setResults({
//                 found: foundCount > 0,
//                 count: foundCount,
//                 sentiment,
//                 images: images.map((img: any, index: number) => ({
//                     ...img,
//                     alt: imageAltTexts[index]?.alt || 'No alt text',
//                 })),
//             });

//             toast.success(`Dummy content check completed. Found: ${foundCount} instances.`, { position: "bottom-right" });
//         } catch (error: any) {
//             console.error('Error fetching URL:', error);
//             toast.error(`Error: ${error.message}`, { position: "bottom-right" });
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className=" text-white ">

//             <div className=" min-h-screen  ">

//                 <motion.div
//                     className="bg-white rounded-lg shadowop p-6 mb-8"
//                     initial={{ opacity: 0, y: 20 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ duration: 0.5 }}
//                 >
//                     <label htmlFor="website-url" className="block text-lg font-medium text-gray-700 mb-2">
//                         Detect and Eliminate Dummy Content                            </label>
//                     <div className='flex items-center gap-2 '>
//                         <input
//                             type="text"
//                             value={url}
//                             onChange={handleInputChange}
//                             placeholder="http://example.com"
//                             className="w-2/3 p-3 rounded  text-gray-800  outline-none focus:outline-none focus:ring-2 focus:ring-brantext-brand-blue1 bg-lightblue"
//                         />
//                         <motion.button
//                             className={`px-8 py-2 bg-brand-blue1 text-white  h-full  rounded-lg flex items-center gap-2 hover:scale-105 smooth3 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ' transition-colors'}`}
//                             onClick={checkDummyContent}
//                             disabled={loading}
//                             whileHover={{ scale: 1.05 }}
//                             whileTap={{ scale: 0.95 }}
//                         >
//                             {loading ? (
//                                 <motion.div
//                                     className="inline-block"
//                                     animate={{ rotate: 360 }}
//                                     transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
//                                 >
//                                     ⟳
//                                 </motion.div>
//                             ) : 'Check Content'}
//                         </motion.button>
//                     </div>
//                     <p className=" flex gap-2 items-center text-homegrey"><span className="flex items-center text-brand-blue1 gap-1 font-bold my-2"> <PiArrowBendLeftUpBold className="font-bold text-xl" /> Get started: </span> Paste your text or URL to identify dummy content and ensure your site is polished and professional.</p>
//                 </motion.div>

//                 {!results && !screenshotUrl && (

//                     <div className="flex flex-col md:flex-row w-full  justify-between px-4 md:px-8 lg:px-16 py-12 mx-auto text-black">
//                         {/* Left Section */}
//                         <div className="w-full md:w-[50%] flex flex-col items-start gap-8 ">
//                             {/* Heading and Description */}
//                             <div className="flex flex-col gap-4">
//                                 <h3 className="text-3xl font-semibold leading-tight ">
//                                     Eliminate Placeholder Content  Effortlessly    </h3>
//                                 <p className="text-base  leading-relaxed">
//                                     Enter text or a URL to detect dummy content and ensure your site looks professional  and complete.    </p>
//                             </div>

//                             {/* Benefits Section */}
//                             <div className="flex flex-col gap-4">
//                                 <h3 className="text-lg font-semibold ">Benefits:</h3>
//                                 <ul className="flex flex-col gap-2 ">
//                                     <li className="flex items-center gap-2">
//                                         <span className="w-1.5 h-1.5 rounded-full " />
//                                         Enhance Professionalism: Remove filler text and polish your content.      </li>
//                                     <li className="flex items-center gap-2">
//                                         <span className="w-1.5 h-1.5 rounded-full " />
//                                         Improve Credibility: Present a finalized, error-free website.      </li>
//                                     <li className="flex items-center gap-2">
//                                         <span className="w-1.5 h-1.5 rounded-full " />
//                                         Streamline Content Review: Identify gaps and make edits quickly.      </li>
//                                 </ul>
//                             </div>

//                             {/* Try it now section */}
//                             <div className="flex flex-col gap-2">
//                                 <span className="text-[#0096FF] font-medium">Try it now!</span>
//                                 <span className="text-sm ">Enter a link above to see the results.</span>
//                             </div>
//                         </div>

//                         {/* Right Section - Image */}
//                         <div className="w-full md:w-[50%] flex items-center mt-8 md:mt-0 -z-0">
//                             <div className="relative w-full max-w-[700px] aspect-[4/3]">
//                                 <Image
//                                     src="/images/Group 1000005720.svg"
//                                     width={1}
//                                     height={1}
//                                     className="w-full object-contain transform scale-125 "
//                                     alt="SEO Analysis Dashboard"
//                                     priority
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 {results && (
//                     <motion.div className="bg-white rounded-lg shadow-lg p-6 mb-8 text-gray-800">
//                         <h2 className="text-2xl font-bold mb-4 text-brand-blue1">Results</h2>

//                         {/* Dummy content info */}
//                         <p className="mb-4">
//                             {results.found
//                                 ? `Found ${results.count} instances of dummy content!`
//                                 : "No dummy content found."}
//                         </p>

//                         {/* Display Sentiment Score */}
//                         <p className="mb-4">
//                             <strong>Sentiment:</strong> {results.sentiment} (Score: {results.sentimentScore})
//                         </p>

//                         {/* Show article summary */}
//                         <p className="mb-4">
//                             <strong>Summary:</strong> {results.summary}
//                         </p>

//                         {/* Show article author */}
//                         <p className="mb-4">
//                             <strong>Author:</strong> {results.author}
//                         </p>

//                         {/* Image Information */}
//                         <h3 className="text-xl font-semibold mb-2">Images and Suggested Alt Texts:</h3>
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                             {results.images.map((img: any, index: number) => (
//                                 <motion.div key={index} className="border p-2 rounded">
//                                     <img src={img.url} alt={img.alt} className="w-full h-auto" />
//                                     <p className="mt-2"><strong>Suggested Alt Text:</strong> {img.alt}</p>
//                                     <p className="mt-1"><strong>Suggested Tags:</strong> {img.tags}</p>
//                                     <p className="mt-1"><strong>Dimensions:</strong> {img.width}x{img.height}</p>
//                                     <p className="mt-1"><strong>File Size:</strong> {img.size}</p>
//                                 </motion.div>
//                             ))}
//                         </div>
//                     </motion.div>
//                 )}


//                 {screenshotUrl && (
//                     <motion.div
//                         className="bg-white rounded-lg shadow-lg p-6 mb-8 text-gray-800"
//                         initial={{ opacity: 0, y: 20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.5 }}
//                     >
//                         <h3 className="text-2xl font-bold mb-4 text-brand-blue1">Website Screenshot:</h3>
//                         <img src={screenshotUrl} alt="Screenshot" width={800} height={600} className="w-full h-auto border rounded" />
//                     </motion.div>
//                 )}
//             </div>
//         </div>
//     );
// }