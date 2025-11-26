"use client";

import { Suspense } from "react";
import Dashboard from "./dashboard/page";
import CommonLoading from "../components/common/Loader";

const Page = () => {
  return (
    <div>
      <Suspense fallback={<CommonLoading />}>
        <Dashboard />
      </Suspense>
    </div>
  );
};

export default Page;
