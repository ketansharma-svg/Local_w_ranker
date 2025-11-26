'use client';
import React, { useState, useEffect } from 'react'
import Image from 'next/image';
import Link from 'next/link';
import { EyeIcon, EyeOffIcon, Loader2 } from 'lucide-react'
import { FcGoogle } from "react-icons/fc";
import { motion } from "framer-motion";
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { redirect, useRouter } from 'next/navigation';

import type { Metadata } from 'next';

import axios from 'axios';
import { useProfile } from '@/src/redux/providers/ProfileProvider';

import { useDispatch } from "react-redux";
import { userExist, userNotExist } from '@/src/redux/reducer/userReducer';
import { validateEmail, validatePassword } from '@/src/util/validation';
import { BASE_URL_WR } from '@/src/util/api';
import { useSession } from 'next-auth/react';
import { IoArrowBack } from 'react-icons/io5';

export const metadata: Metadata = {
    title: 'Sign In - My App',
    description: 'Login to access your account on My App.',
    robots: 'index, follow', // ✅ This tells search engines to index & follow links
};

interface FormData {
    email: string;
    password: string;
    rememberMe: boolean;
}
interface FormErrors {
    email: string;
    password: string;
}
interface TouchedFields {
    email: boolean;
    password: boolean;
    rememberMe: boolean;
}
const SigninForm: React.FC = () => {
    const { data: sessionData, status } = useSession()
    const { fetchProfile } = useProfile();
    const router = useRouter()
    useEffect(() => {
                  const reddoamin = localStorage.getItem("connectingProjectDomain")

        if (sessionData) {
            router.push(`/dashboard?domain=${reddoamin}`)
        }
        if (localStorage.getItem("redirectTo") === "coverage") {
            router.push(`/dashboard?domain=${reddoamin}`)
        }
        if (localStorage.getItem("redirectTo") === "keywordInsights") {
            router.push(`/keyword-insights?domain=${reddoamin}`)
        }
    }, [sessionData, router])

    //   const { user, loading } = useSelector((state: RootState) => state.userReducer);
    const [showPassword, setShowPassword] = useState(false);
    const [verifyEmail, setVerifyEmail] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: '',
        rememberMe: false
    });
    const [formErrors, setFormErrors] = useState<FormErrors>({
        email: '',
        password: '',
    });
    const [touchedFields, setTouchedFields] = useState<TouchedFields>({
        email: false,
        password: false,
        rememberMe: false,
    })
    const [isFormValid, setIsFormValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading] = useState(false);
    const [isForgetPassword, setIsForgetPassword] = useState(false);
    const [isForgetting, setisForgetting] = useState(false);

    const backToSignin = () => {
        setIsForgetPassword(false);
    };
      const forgetPassmodal = () => {
    setIsForgetPassword(true);
  };

    const handleForget = async (e: any) => {
        e.preventDefault();
        setisForgetting(true);
        try {
            const response = await axios.post(
                `${BASE_URL_WR}backend-auth/forgot-password/`,
                {
                    email: formData.email,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );
            toast.success(response.data.message, {
                position: "bottom-center",
                style: {
                    borderRadius: "10px",
                    background: "#333",
                    color: "#fff",
                },
            });
        } catch (error: any) {
            console.error("Signin failed", error);
            toast.error(error.response.data.error, {
                position: "bottom-center",
                style: {
                    borderRadius: "10px",
                    background: "#333",
                    color: "#fff",
                },
            });
        } finally {
            setisForgetting(false);
        }
    };

    useEffect(() => {
        const errors = {
            email: validateEmail(formData.email),
            password: validatePassword(formData.password),
        };
        setFormErrors(errors);
        setIsFormValid(
            Object.values(errors).every(error => error === '') &&
            Object.values(formData).every(value => value !== '')
        );
    }, [formData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setTouchedFields(prev => ({
            ...prev,
            [name]: true
        }));
    };
    const dispatch = useDispatch();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        setIsLoading(true);
        try {
            const response = await axios.post(`${BASE_URL_WR}backend-auth/login/`, {
                email: formData.email,
                password: formData.password,
            }, {
                headers: {
                    "Content-Type": "application/json"
                }
            });
            Cookies.set('login_access_token_wrank', response.data.access, {
                expires: 1,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
            });
            Cookies.set('login_refresh_token_wrank', response.data.refresh, {
                expires: 7,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
            });
            Cookies.set('session_last_activity', Date.now().toString(), {
                expires: 1,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
            });
            const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).getTime();
            Cookies.set('session_expires_at', oneHourFromNow.toString(), {
                expires: 1,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
            });
            await fetchProfile();    
            dispatch(userExist(response.data));

            if (response.data.is_email_verified) {
                router.push('/dashboard')
            }
            else {
                try {
                    await axios.post(
                        `${BASE_URL_WR}backend-auth/email-verification/`,
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${response.data.access}`,
                                "Content-Type": "application/json",
                            },
                        },
                    )
                     await fetchProfile();    
                    router.push('/dashboard')
                    toast.success("Verification email sent. Please check your inbox.")
                    setVerifyEmail(true)
                }
                catch (e) {
                    console.log(e);
                    toast.error('Error sending verification email please try again')
                }
            }
        } catch (error) {
            dispatch(userNotExist());
            if (axios.isAxiosError(error) && error.response) {
                if (error.response.data.detail) {
                    toast.error(error.response.data.detail)
                } else {
                    toast.error("Signin failed");
                }
            } else {
                toast.error("An unexpected error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>

            <main className="min-h-screen bg-[url(/images/signinbg.svg)] flex-col  flex items-center justify-center p-4">

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[1200px] flex flex-col-reverse lg:flex-row items-center justify-between gap-8"
                >
                    {/* Left side - Illustration */}
                    <div className="flex-1 max-w-[600px]">
                        <Image
                            src='/images/signinimg.svg'
                            alt="Developer illustration"
                            width={400}
                            height={400}
                        />
                    </div>
                    {/* Right side - Form */}
                    <div className="flex-1 max-w-[480px] w-full">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-[20px] p-8 shadow-xl">
                            <div className="text-center mb-8">
                                <p className="text-gray-500 mb-2">Sign in to</p>
                                <h1 className="!text-[34px] !font-semibold text-black">Free SEO Tools</h1>
                            </div>
                            {/* {!session && ( */}
                            <button
                                onClick={() => window.location.href = "/next/gmail-auth"}
                                disabled={isGoogleLoading}
                                className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md p-3 mb-6 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
                            >

                                {isGoogleLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-pink flex items-center justify-center" />
                                ) : (
                                    <FcGoogle className="text-xl" />
                                )}
                                <span className="text-sm">
                                    {isGoogleLoading ? 'Processing...' : 'Continue with Google'}
                                </span>
                            </button> 
                            {/* )} */}
                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-500">or</span>
                                </div>
                            </div>

              <div className="relative mx-auto w-full  overflow-hidden rounded-lg bg-white">
                <motion.div
                  initial={{ x: 0 }}
                  animate={{ x: isForgetPassword ? "-50%" : "0%" }}
                  transition={{
                    duration: 0.4}}
                  className=" flex w-[200%]"
                >
                  <form onSubmit={handleSubmit} className=" w-full space-y-4">
                    <div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none  "
                        required
                      />
                      {touchedFields.email && formErrors.email && (
                        <p className="mt-1 text-sm text-red-500">
                          {formErrors.email}
                        </p>
                      )}
                    </div>
                    {/* Password Input */}
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none  "
                        required
                      />
                      {touchedFields.password && formErrors.password && (
                        <p className="mt-1 text-sm text-red-500">
                          {formErrors.password}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {/* Remember Me Checkbox */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleInputChange}
                        className="text-blue-600 h-4 w-4 rounded border-gray-300 focus:ring-blue"
                      />
                      <div className="flex w-full flex-row justify-between">
                        <label htmlFor="rememberMe" className="text-sm">
                          Remember Me
                        </label>
                        <p
                          onClick={forgetPassmodal}
                          className="text-sm text-pink hover:cursor-pointer hover:underline"
                        >
                          Forget Password
                        </p>
                      </div>
                    </div>
                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="    w-full py-3 rounded-full border smooth3
    !bg-brand-blue1 !text-white
    hover:!bg-brand-blue1/90 hover:shadow-lg 
    focus:ring-2 focus:ring-brand-blue1/40
    transition-all duration-200 ease-in-out

    disabled:!bg-gray-300 disabled:!text-gray-500 disabled:cursor-not-allowed
    disabled:hover:!bg-gray-300 disabled:hover:shadow-none disabled:hover:translate-y-0
    disabled:border-gray-300"
                      disabled={!isFormValid || isLoading}
                    >
                      {isLoading ? (
                        <div className="flex w-full items-center justify-center">
                          <p> Processing... </p>
                          <Loader2 className="flex h-5 w-5 animate-spin items-center justify-center text-pink" />
                        </div>
                      ) : (
                        "LOG IN"
                      )}
                    </button>
                  </form>

                  {/* Forgot Password Form */}
                  <form
                    onSubmit={handleForget}
                    className="w-full bg-white px-6"
                  >
                    <div className="mb-4">
                      <label
                        htmlFor="email"
                        className="text-dark mb-2.5 block font-medium "
                      >
                        E-mail
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter your E-mail"
                          className="text-dark dark:border-dark-3 dark:bg-dark-2 w-full rounded-lg border border-gray-300 bg-transparent py-[15px] pl-6 pr-11 font-medium outline-none focus:border-primary focus-visible:shadow-none  dark:focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="mb-4.5">
                      <button
                        type="submit"
                        className="smooth3 w-full rounded-full border bg-brand-blue1 py-3 font-medium text-white transition-colors hover:bg-brand-blue1 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-grey disabled:text-homegrey flex items-center justify-center gap-2"
                      >
                        {isForgetting && (
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        )}
                        Reset Password
                      </button>
                    </div>
                    <p
                      onClick={backToSignin}
                      className="text-dark smooth flex cursor-pointer items-center gap-1 text-base font-medium hover:text-primary "
                    >
                      <IoArrowBack />
                      Back to Sign In
                    </p>
                  </form>
                </motion.div>
              </div>

                            <p className="text-center mt-6 text-sm">
                                Already have an account?{' '}
                                <Link href="/signup" className="text-pink hover:underline">
                                    Sign up
                                </Link>
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
                <div className="fixed flex justify-between gap-6 bottom-4 right-14 text-lg">
                    <Link
                        href="https://www.w3era.com/terms-conditions/" target='_blank'
                        className="hover:underline text-gray-700 transition duration-300"
                    >
                        Terms & Condition  </Link>
                    <Link
                        href="https://www.w3era.com/privacy-policy/" target='_blank'
                        className="hover:underline text-gray-700 transition duration-300"
                    >
                        Privacy Policy
                    </Link>
                </div>
            </main>

        </div>
    )
}

export default SigninForm