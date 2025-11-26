import { BASE_URL_WR } from "@/src/util/api";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "No code found" }, { status: 400 });
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        redirect_uri: process.env.GMAIL_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.json({ error: "No access token" }, { status: 400 });
    }

    try {
      const backendResponse = await fetch(`${BASE_URL_WR}backend-auth/google-login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: tokenData.id_token,
        }),
      });

      if (!backendResponse.ok) {
        throw new Error(`Backend login failed with status ${backendResponse.status}`);
      }

      const backendData = await backendResponse.json();
      // Set cookies
      const cookieStore =await cookies();
      cookieStore.set("login_access_token_wrank", backendData.access_token, {
        maxAge: tokenData.expires_in || 3600,
      });
      cookieStore.set("login_refresh_token_wrank", backendData.refresh_token, {
        maxAge: tokenData.expires_in || 3600,
      });
      // Redirect to the intended page instead of signin
      const redirectUrl = new URL("/keyword-insights", request.url);
      return NextResponse.redirect(redirectUrl);
    } catch (error) {
      console.error("Google login failed:", error);
      return NextResponse.json(
        { error: "Google login failed. Please try again." },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
