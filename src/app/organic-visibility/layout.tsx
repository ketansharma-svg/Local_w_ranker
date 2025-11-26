"use client"
import Layout from '@/src/components/layout';
import React from 'react';


const ToolLayout = ({ children }: { children: React.ReactNode }) => {

  return (
    <Layout>
      {children}
    </Layout>
  )
}

export default Layout;