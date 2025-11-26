
import React from 'react'

import type { Metadata } from 'next';
import SigninForm from './SignInForm';


export const metadata: Metadata = {
    title: 'Sign In - Free SEO Tools',
    description: 'Login to access your account on My App.',
    robots: 'noindex, nofollow',
};

const Signin: React.FC = () => {

    return (
        <SigninForm />
        // <></>
    )
}

export default Signin