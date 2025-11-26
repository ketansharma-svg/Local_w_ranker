"use client"
import { ProfileSidebar } from "@/src/components/accounts/profile-sidebar";
import Header from "@/src/components/header";
import { useParams } from "next/navigation";

export default function AccLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const params = useParams()
    const activeTab = params.tab as string

    return (


        <>
            <Header />
            <div className="min-h-screen bg-gray-50">
                <div className="mx-auto">
                    <div className="flex">
                        <ProfileSidebar activeTab={activeTab} />
                        {children}

                    </div>
                </div>
            </div>
        </>

    );
}
