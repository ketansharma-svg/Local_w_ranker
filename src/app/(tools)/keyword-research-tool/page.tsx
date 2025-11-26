import React from 'react'
import KeywordResearchToolheader from "./components/KeywordResearchToolheader";
import { TaskDrawerProvider } from '@/src/redux/providers/TaskDrawerProvider';

const Page = () => {
    return (
        <><TaskDrawerProvider>
            <KeywordResearchToolheader />
        </TaskDrawerProvider>

        </>
    )
}

export default Page;