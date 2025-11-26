import { NextResponse } from "next/server"

export async function GET() {
  const CLIENT_ID = process.env.GMAIL_CLIENT_ID!
  const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI!
  const SCOPES = "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  })

  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return NextResponse.redirect(oauthUrl)
}
