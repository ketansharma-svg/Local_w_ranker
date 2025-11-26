import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt" },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: "openid email profile https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics"
                }
            }
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
            token.accessToken = account.access_token
            token.idToken = account.id_token
            token.refreshToken = account.refresh_token;
            }
            return token
        },
        async session({ session, token }: { session: any; token: any }) {
            session.accessToken = token.accessToken
            session.idToken = token.idToken
            session.refreshToken = token.refreshToken;
            return session
        },
         async redirect({ url, baseUrl }) {
            // Handle relative URLs
            if (url.startsWith("/")) {
                return `${baseUrl}${url}`
            }
            
            // Handle absolute URLs from the same origin
            if (url.startsWith(baseUrl)) {
                return url
            }
            
            // Handle OAuth callback URLs
            if (url.includes('/api/auth/callback/google')) {
                const urlObj = new URL(url)
                const callbackUrl = urlObj.searchParams.get('callbackUrl')
                
                // If callbackUrl is provided and it's from the same origin, use it
                if (callbackUrl && callbackUrl.startsWith(baseUrl)) {
                    return callbackUrl
                }
                
                // Default fallback based on localStorage or session
                return `${baseUrl}/keyword-insights`
            }
            
            // Default fallback
            return `${baseUrl}/dashboard`
        }
    },
    debug: true,
}