"use client"

import CommonLoading from "@/src/components/common/Loader"
import { motion } from "framer-motion"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
export default function Loading() {
  return (
    <>
<CommonLoading />
<ToastContainer />
    </>
  )
}
