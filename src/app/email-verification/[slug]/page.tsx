"use client";
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { Spin } from 'antd';
import { BASE_URL_WR } from '@/src/util/api';

const Page = () => {
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const lastString = pathname.split('/').pop();

  const fetchData = async () => {
    try {
      const response = await axios.get(`${BASE_URL_WR}backend-auth/verify-email/${lastString}/`);
      if (response.status === 200) {
        setMessage(response.data.message);

        // Redirect to the homepage after a delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (error:any) {
      if (error.response) {
        // Server responded with a status other than 200 range
        setErrorMessage(`Error: ${error.response.data.message || error.message}`);
      } else if (error.request) {
        // Request was made but no response received
        setErrorMessage("No response from server. Please try again.");
      } else {
        // Other errors
        setErrorMessage(`Unexpected error: ${error.message}`);
      }
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-blue3 to-brandfrom-brand-blue3/50">
      <div className="text-center p-10 bg-white/70 backdrop-blur-lg rounded-lg shadow-lg animate-fade-in">
        {message && (
          <>
            <h1 className="text-3xl font-semibold text-gray-800 mb-4">
              {message}
            </h1>
            <p className='flex gap-2'>Redirecting to Homepage <Spin/> </p>
          </>
        )}
        {errorMessage && (
          <>
          <h1 className="text-2xl font-semibold text-red-600 mb-4">
            {errorMessage}
          </h1>
          <button className='bg-white text-black rounded-lg px-4 py-2' onClick={() => router.push('/')}>Back To Homepage</button>
          </>
        )}
        {!message &&
          <button className='bg-white text-black rounded-lg px-4 py-2' onClick={() => router.push('/')}>Back To Homepage</button>
        }
      </div>
    </div>
  );
};

export default Page;
