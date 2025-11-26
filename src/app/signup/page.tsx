"use client"
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { FcGoogle } from "react-icons/fc"
import { motion } from "framer-motion"
import { useRouter } from 'next/navigation'
import { validateName, validateEmail, validatePassword, validateConfirmPassword } from '@/src/util/validation';
import axios from 'axios'
import { signOut, useSession } from 'next-auth/react'
import { useGTM } from '@/src/hooks/useGTM'
import { BASE_URL_WR } from '@/src/util/api';

interface FormData {
  fullname: string;
  email: string;
  password: string;
  password2: string;
  agreeToTerms: boolean;
  newsletter: boolean; // Added for newsletter subscription
}

interface FormErrors {
  fullname: string;
  email: string;
  password: string;
  password2: string;
  agreeToTerms: string;
}

interface TouchedFields {
  fullname: boolean;
  email: boolean;
  password: boolean;
  password2: boolean;
  agreeToTerms: boolean;
}

const Signup: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullname: '',
    email: '',
    password: '',
    password2: '',
    agreeToTerms: false,
    newsletter: false // Initialize newsletter as false
  });

  const { pushEvent } = useGTM()
  const [formErrors, setFormErrors] = useState<FormErrors>({
    fullname: '',
    email: '',
    password: '',
    password2: '',
    agreeToTerms: '',
  });

  const [touchedFields, setTouchedFields] = useState<TouchedFields>({
    fullname: false,
    email: false,
    password: false,
    password2: false,
    agreeToTerms: false,
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const router = useRouter();
  const { data: session } = useSession() || {}

  useEffect(() => {
    const errors = {
      fullname: validateName(formData.fullname),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      password2: validateConfirmPassword(formData.password, formData.password2),
      agreeToTerms: formData.agreeToTerms ? '' : 'You must agree to the terms.',
    };
    setFormErrors(errors);
    setIsFormValid(
      Object.values(errors).every(error => error === '') &&
      Object.values(formData).every((value, index) => 
        index === 4 ? true : value !== '' // Skip validation for newsletter (index 4)
      ) &&
      formData.agreeToTerms
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const backendData = {
      full_name: formData.fullname,
      email: formData.email,
      password: formData.password,
      password2: formData.password2,
      agreeToTerms: formData.agreeToTerms,
      newsletter: formData.newsletter 
    };

    try {
       await axios.post(
        `${BASE_URL_WR}backend-auth/register/`,
        backendData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );      
      toast.success("Signup successful");
      pushEvent('signup')
      router.push("/dashboard");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.email ? error.response.data.email : error.response.data.non_field_errors[0]);
      } else {
        toast.error("An unexpected error occurred");
      }
      console.log(error);
    }
  }

  return (
    <div>
      <main className="min-h-screen bg-[url(/images/signinbg.svg)] flex items-center justify-center p-4 animate-fill-bg">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[1200px] flex flex-col-reverse lg:flex-row items-center justify-between gap-8"
        >
          {/* Left side - Illustration */}
          <div className="flex-1 max-w-[600px]">
            <Image
              src="/images/signinimg.svg"
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
                <p className="text-gray-500 mb-2">Register to</p>
                <h1 className="!text-[34px] !font-semibold text-black">Wranker</h1>
              </div>
              {/* Google Sign In Button */}
              {!session ? (
                <button
                  onClick={() => window.location.href = "/next/gmail-auth"}
                  className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md p-3 mb-6 hover:bg-gray-50 hover:scale-105 smooth3 transition-colors">
                  <FcGoogle className="text-xl" />
                  <span className="text-sm">Continue with Google</span>
                </button>
              ) : (
                <div>
                  <p>Signed in as {session.user!.email}</p>
                  <button
                    onClick={() => signOut()}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md"
                  >
                    Sign Out
                  </button>
                </div>
              )}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or</span>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    name="fullname"
                    placeholder="Full Name"
                    value={formData.fullname}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue focus:border-transparent"
                    required
                  />
                  {touchedFields.fullname && formErrors.fullname && <p className="text-red-500 text-sm mt-1">{formErrors.fullname}</p>}
                </div>
                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue focus:border-transparent"
                    required
                  />
                  {touchedFields.email && formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue focus:border-transparent"
                    required
                  />
                  {touchedFields.password && formErrors.password && <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    name="password2"
                    placeholder="Confirm Password"
                    value={formData.password2}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none 
                    focus:ring-2 focus:ring-blue focus:border-transparent"
                    required
                  />
                  {touchedFields.password2 && formErrors.password2 && <p className="text-red-500 text-sm mt-1">{formErrors.password2}</p>}
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showPasswordConfirm ? (
                      <EyeOffIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue"
                      required
                    />
                    <label htmlFor="terms" className="text-sm">
                      I agree to{' '}
                      <Link href="#" className="text-pink hover:underline">
                        Terms & Conditions
                      </Link>
                    </label>
                  </div>
                  {touchedFields.agreeToTerms && formErrors.agreeToTerms && <p className="text-red-500 text-sm mt-1">{formErrors.agreeToTerms}</p>}
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="newsletter"
                      name="newsletter"
                      checked={formData.newsletter}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue"
                    />
                    <label htmlFor="newsletter" className="text-sm text-gray-600">
                      Subscribe to SEO tips and product updates (optional)
                    </label>
                  </div>
                </div>
<button
  type="submit"
  className={`
    w-full py-3 rounded-full border smooth3
    !bg-brand-blue1 !text-white
    hover:!bg-brand-blue1/90 hover:shadow-lg 
    focus:ring-2 focus:ring-brand-blue1/40
    transition-all duration-200 ease-in-out

    disabled:!bg-gray-300 disabled:!text-gray-500 disabled:cursor-not-allowed
    disabled:hover:!bg-gray-300 disabled:hover:shadow-none disabled:hover:translate-y-0
    disabled:border-gray-300
  `}
  disabled={!isFormValid}
>
  REGISTER
</button>

              </form>
              <p className="text-center mt-6 text-sm ">
                Already have an account?{" "}
                <Link href="/signin" className="text-pink hover:underline">
                  Sign in
                </Link>
              </p>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Signup;













// "use client"
// import React, { useState, useEffect } from 'react'
// import { toast } from 'sonner'
// import Image from 'next/image'
// import Link from 'next/link'
// import { EyeIcon, EyeOffIcon, ChevronDown } from 'lucide-react'
// import { FcGoogle } from "react-icons/fc"
// import { motion } from "framer-motion"
// import { useRouter } from 'next/navigation'
// import { validateName, validateEmail, validatePassword, validateConfirmPassword } from '@/src/util/validation'
// import axios from 'axios'
// import { signOut, useSession } from 'next-auth/react'
// import { useGTM } from '@/src/hooks/useGTM'
// import { BASE_URL_WR } from '@/src/util/api'

// interface FormData {
//   fullname: string
//   email: string
//   password: string
//   password2: string
//   company?: string
//   agreeToTerms: boolean
//   subscribeToUpdates: boolean
// }

// interface FormErrors {
//   fullname: string
//   email: string
//   password: string
//   password2: string
//   agreeToTerms: string
// }

// const Signup: React.FC = () => {
//   const [showPassword, setShowPassword] = useState(false)
//   const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
//   const [isLoading, setIsLoading] = useState(false)
//   const [passwordStrength, setPasswordStrength] = useState(0)
//   const [showCompanyField, setShowCompanyField] = useState(false)

//   const [formData, setFormData] = useState<FormData>({
//     fullname: '',
//     email: '',
//     password: '',
//     password2: '',
//     company: '',
//     agreeToTerms: false,
//     subscribeToUpdates: false
//   })

//   const { pushEvent } = useGTM()
//   const [formErrors, setFormErrors] = useState<FormErrors>({
//     fullname: '',
//     email: '',
//     password: '',
//     password2: '',
//     agreeToTerms: '',
//   })

//   const [isFormValid, setIsFormValid] = useState(false)
//   const router = useRouter()
//   const { data: session } = useSession()

//   useEffect(() => {
//     const errors = {
//       fullname: validateName(formData.fullname),
//       email: validateEmail(formData.email),
//       password: validatePassword(formData.password),
//       password2: validateConfirmPassword(formData.password, formData.password2),
//       agreeToTerms: formData.agreeToTerms ? '' : 'You must agree to the terms.',
//     }
//     setFormErrors(errors)
//     setIsFormValid(
//       Object.values(errors).every(error => error === '') &&
//       formData.fullname !== '' &&
//       formData.email !== '' &&
//       formData.password !== '' &&
//       formData.password2 !== '' &&
//       formData.agreeToTerms
//     )
//   }, [formData])

//   useEffect(() => {
//     // Calculate password strength
//     let strength = 0
//     if (formData.password.length >= 8) strength += 1
//     if (/[A-Z]/.test(formData.password)) strength += 1
//     if (/[0-9]/.test(formData.password)) strength += 1
//     if (/[^A-Za-z0-9]/.test(formData.password)) strength += 1
//     setPasswordStrength(strength)
//   }, [formData.password])

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value, type, checked } = e.target
//     setFormData(prev => ({
//       ...prev,
//       [name]: type === 'checkbox' ? checked : value
//     }))
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setIsLoading(true)
    
//     try {
//       const response = await axios.post(
//         `${BASE_URL_WR}backend-auth/register/`,
//         {
//           firstname: formData.fullname.split(' ')[0],
//           lastname: formData.fullname.split(' ').slice(1).join(' ') || '',
//           email: formData.email,
//           password: formData.password,
//           password2: formData.password2,
//           company: formData.company,
//           agreeToTerms: formData.agreeToTerms
//         },
//         {
//           headers: {
//             "Content-Type": "application/json",
//           },
//         }
//       )
      
//       toast.success("Check your email to verify your account and get started!")
//       pushEvent('signup')
//       router.push("/signin")
//     } catch (error) {
//       if (axios.isAxiosError(error) && error.response) {
//         if (error.response.data.email) {
//           toast.error("This email is already registered")
//         } else {
//           toast.error(error.response.data.non_field_errors?.[0] || "An error occurred during registration")
//         }
//       } else {
//         toast.error("An unexpected error occurred")
//       }
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col">
//       <main className="flex-1 flex items-center justify-center p-4">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.3 }}
//           className="w-full max-w-md"
//         >
//           <div className="text-center mb-8">
//             <Image
//               src="/images/signinimg.svg"
//               alt="Developer illustration"
//               width={400}
//               height={400}
//             />
//             <h1 className="text-2xl font-bold text-gray-900">Create Your Wranker Account</h1>
//             <p className="text-gray-600 mt-2">One Tool. All Your SEO Needs.</p>
//           </div>

//           <div className="mb-6">
//             <button
//               onClick={() => window.location.href = "/next/gmail-auth"}
//               className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
//             >
//               <FcGoogle className="text-lg" />
//               <span>Sign up with Google</span>
//             </button>
//           </div>

//           <div className="relative mb-6">
//             <div className="absolute inset-0 flex items-center">
//               <div className="w-full border-t border-gray-300"></div>
//             </div>
//             <div className="relative flex justify-center">
//               <span className="px-2 bg-gray-50 text-sm text-gray-500">or sign up with email</span>
//             </div>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label htmlFor="fullname" className="block text-sm font-medium text-gray-700 mb-1">
//                 Full Name
//               </label>
//               <input
//                 type="text"
//                 id="fullname"
//                 name="fullname"
//                 placeholder="John Doe"
//                 value={formData.fullname}
//                 onChange={handleInputChange}
//                 className="w-full px-4 py-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 required
//               />
//               {formErrors.fullname && <p className="mt-1 text-sm text-red-600">{formErrors.fullname}</p>}
//             </div>

//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 id="email"
//                 name="email"
//                 placeholder="you@example.com"
//                 value={formData.email}
//                 onChange={handleInputChange}
//                 className="w-full px-4 py-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 required
//               />
//               {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
//             </div>

//             {showCompanyField ? (
//               <div>
//                 <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
//                   Company/Agency Name (optional)
//                 </label>
//                 <input
//                   type="text"
//                   id="company"
//                   name="company"
//                   placeholder="Your company name"
//                   value={formData.company}
//                   onChange={handleInputChange}
//                   className="w-full px-4 py-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//               </div>
//             ) : (
//               <button
//                 type="button"
//                 onClick={() => setShowCompanyField(true)}
//                 className="flex items-center text-sm text-blue-600 hover:text-blue-800"
//               >
//                 <span>+ Add company/agency name (optional)</span>
//                 <ChevronDown className="ml-1 w-4 h-4" />
//               </button>
//             )}

//             <div>
//               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
//                 Password
//               </label>
//               <div className="relative">
//                 <input
//                   type={showPassword ? 'text' : 'password'}
//                   id="password"
//                   name="password"
//                   placeholder="••••••••"
//                   value={formData.password}
//                   onChange={handleInputChange}
//                   className="w-full px-4 py-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   required
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
//                 >
//                   {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
//                 </button>
//               </div>
//               {formErrors.password && <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>}
              
//               {/* Password strength meter */}
//               <div className="mt-2">
//                 <div className="flex gap-1">
//                   {[1, 2, 3, 4].map((i) => (
//                     <div 
//                       key={i}
//                       className={`h-1 flex-1 rounded-full ${
//                         passwordStrength >= i 
//                           ? i <= 2 ? 'bg-red-500' : i === 3 ? 'bg-yellow-500' : 'bg-green-500'
//                           : 'bg-gray-200'
//                       }`}
//                     />
//                   ))}
//                 </div>
//                 <p className="text-xs text-gray-500 mt-1">
//                   Password must be at least 8 characters with a number or symbol
//                 </p>
//               </div>
//             </div>

//             <div>
//               <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-1">
//                 Confirm Password
//               </label>
//               <div className="relative">
//                 <input
//                   type={showPasswordConfirm ? 'text' : 'password'}
//                   id="password2"
//                   name="password2"
//                   placeholder="••••••••"
//                   value={formData.password2}
//                   onChange={handleInputChange}
//                   className="w-full px-4 py-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   required
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
//                   className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
//                 >
//                   {showPasswordConfirm ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
//                 </button>
//               </div>
//               {formErrors.password2 && <p className="mt-1 text-sm text-red-600">{formErrors.password2}</p>}
//             </div>

//             <div className="space-y-3">
//               <div className="flex items-start">
//                 <div className="flex items-center h-5">
//                   <input
//                     id="agreeToTerms"
//                     name="agreeToTerms"
//                     type="checkbox"
//                     checked={formData.agreeToTerms}
//                     onChange={handleInputChange}
//                     className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//                     required
//                   />
//                 </div>
//                 <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-700">
//                   I agree to the{' '}
//                   <Link href="/terms" className="text-blue-600 hover:text-blue-800">
//                     Terms of Service
//                   </Link>{' '}
//                   and{' '}
//                   <Link href="/privacy" className="text-blue-600 hover:text-blue-800">
//                     Privacy Policy
//                   </Link>
//                 </label>
//               </div>
//               {formErrors.agreeToTerms && <p className="text-sm text-red-600">{formErrors.agreeToTerms}</p>}

//               <div className="flex items-start">
//                 <div className="flex items-center h-5">
//                   <input
//                     id="subscribeToUpdates"
//                     name="subscribeToUpdates"
//                     type="checkbox"
//                     checked={formData.subscribeToUpdates}
//                     onChange={handleInputChange}
//                     className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//                   />
//                 </div>
//                 <label htmlFor="subscribeToUpdates" className="ml-2 block text-sm text-gray-700">
//                   Subscribe to SEO tips and product updates
//                 </label>
//               </div>
//             </div>

//             <button
//               type="submit"
//               disabled={!isFormValid || isLoading}
//               className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//             >
//               {isLoading ? (
//                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg>
//               ) : null}
//               Create Account
//             </button>
//           </form>

//           <div className="mt-6 text-center text-sm">
//             <p className="text-gray-600">
//               Already have an account?{' '}
//               <Link href="/signin" className="font-medium text-blue-600 hover:text-blue-500">
//                 Log in
//               </Link>
//             </p>
//           </div>
//         </motion.div>
//       </main>
//     </div>
//   )
// }

// export default Signup