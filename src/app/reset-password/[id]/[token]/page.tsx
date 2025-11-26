"use client";

import axios from "axios";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Image from "next/image";
import { BASE_URL_WR } from "@/src/util/api";

export default function Reset({ params }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const id = pathname.split("/");
  const token = pathname.split("/");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [user, setUser] = useState({
    password: "",
    password2: "",
  });

  const [errors, setErrors] = useState({
    password: "",
    password2: "",
  });

  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  const validatePassword = (password: any) => {
    if (password.length < 8) {
      return false;
    }
    if (/^\d+$/.test(password)) {
      return false;
    }
    if (/^[a-zA-Z]+$/.test(password)) {
      return false;
    }
    return true;
  };

  const validateConfirmPassword = (password: any, confirmPassword: any) => {
    return password === confirmPassword;
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });

    // Perform validation
    if (name === "password") {
      setErrors({
        ...errors,
        password: validatePassword(value)
          ? ""
          : "Password must be at least 8 characters and alphanumeric.",
      });
    } else if (name === "password2") {
      setErrors({
        ...errors,
        password2: validateConfirmPassword(user.password, value)
          ? ""
          : "Passwords do not match",
      });
    }
  };

  useEffect(() => {
    const isFormValid =
      validatePassword(user.password) &&
      validateConfirmPassword(user.password, user.password2);
    setIsButtonDisabled(!isFormValid);
  }, [user]);

  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    setIsUpdating(true);
    try {
      const response = await axios.put(
        `${BASE_URL_WR}backend-auth/reset-password/${params.id}/${params.token}/`,
        { new_password: user.password },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      toast.success("Password updated successfully", {
        position: "bottom-center",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      router.push("/signin");
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "An error occurred while updating the password",
        {
          position: "bottom-center",
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        },
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>


      <main className="flex min-h-screen flex-col  items-center justify-center bg-[url(/images/signinbg.svg)] p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex w-full max-w-[1200px] flex-col-reverse items-center justify-between gap-8 lg:flex-row"
        >
          {/* Left side - Illustration */}
          <div className="max-w-[600px] flex-1">
            <Image
              src="/images/signinimg.svg"
              alt="Developer illustration"
              width={400}
              height={400}
            />
          </div>
          {/* Right side - Form */}
          <div className="w-full max-w-[480px] flex-1">
            <div className=" flex w-full items-center justify-center">
              <div className="flex h-screen w-full  flex-col items-center justify-center md:h-1/2  ">
                <h2 className="mb-6 text-center text-2xl font-bold text-black-2">
                  Update Password
                </h2>

                <form
                  onSubmit={handleSubmit}
                  className="w-full rounded-md bg-white p-6"
                >
                  <div className="mb-4">
                    <label
                      htmlFor="password"
                      className="text-dark mb-2.5 block font-medium "
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={passwordVisible ? "text" : "password"}
                        name="password"
                        value={user.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        className="text-dark dark:border-dark-3 dark:bg-dark-2 w-full rounded-lg border border-gray-300 bg-transparent py-[15px] pl-6 pr-11 font-medium outline-none focus:border-primary focus-visible:shadow-none  dark:focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute inset-y-0 right-4 text-gray-500"
                      >
                        {passwordVisible ? (
                          <FaEyeSlash className="text-xl " />
                        ) : (
                          <FaEye className="text-xl " />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500">{errors.password}</p>
                    )}
                  </div>

                  <div className="mb-4">
                    <label
                      htmlFor="password2"
                      className="text-dark mb-2.5 block font-medium "
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={confirmPasswordVisible ? "text" : "password"}
                        name="password2"
                        value={user.password2}
                        onChange={handleChange}
                        placeholder="Confirm your password"
                        className="text-dark dark:border-dark-3 dark:bg-dark-2 w-full rounded-lg border border-gray-300 bg-transparent py-[15px] pl-6 pr-11 font-medium outline-none focus:border-primary focus-visible:shadow-none  dark:focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className="absolute inset-y-0 right-4 text-gray-500"
                      >
                        {confirmPasswordVisible ? (
                          <FaEyeSlash className="text-xl " />
                        ) : (
                          <FaEye className="text-xl " />
                        )}
                      </button>
                    </div>
                    {errors.password2 && (
                      <p className="text-sm text-red-500">{errors.password2}</p>
                    )}
                  </div>

                  <div className="mb-4.5 flex justify-end">
                    <button
                      type="submit"
                      disabled={isButtonDisabled}
                      className={`flex w-full items-center justify-center gap-2 rounded-lg bg-primary p-4 font-medium text-white transition hover:bg-opacity-90 ${
                        isButtonDisabled ? " cursor-not-allowed" : ""
                      }`}
                    >
                      {" "}
                      {isUpdating && (
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      )}
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

    </>
  );
}
