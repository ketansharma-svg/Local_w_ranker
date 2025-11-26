import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    const authPaths = ['/signin', '/signup'];
    
    // Check both authentication systems
    const backendToken = request.cookies.get('login_access_token_wrank');
    const nextAuthToken = await getToken({ req: request });
    
    const isAuthenticated = Boolean(backendToken || nextAuthToken);

    // Exact match protected paths
    const exactProtected = [
        '/',
        '/dashboard',
        '/analytics',
        '/backlink-monitor',
        '/broken-links-checker',
        '/dummy-content-checker',
        '/image-alt-text-checker',
        '/keyword-rank-checker',
        '/keyword-research',
        '/keyword-research-tool',
        '/keyword-insights',
        '/link-analyzer',
        '/campaign-activity-new',
        '/project-task-overview',
        '/task-templates',
        '/team-performance-board',
        '/team-analytics',
        '/team-management',
        '/backlink-insights',
        '/backlink-audit',
        '/backlink-health-monitor',
        '/roles-management',
        '/roles-management',
        '/home',
        '/access-engagement',
        '/user-activity',
        '/organic-visibility',
        '/project-overview',
        '/competitor-intelligence',
    ];

    // Starts-with protected paths
    const startsWithProtected = ['/accounts', '/campaign-activity'];

    const isProtected =
        exactProtected.includes(path) ||
        startsWithProtected.some((p) => path.startsWith(p));

if (isProtected && !isAuthenticated) {
  const signinUrl = new URL('/signin', request.url);
  return NextResponse.redirect(signinUrl);
}

    // Prevent signed-in users from visiting signin/signup
    if (authPaths.includes(path) && isAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/',
        '/signin',
        '/signup',
        '/dashboard',
        '/analytics',
        '/backlink-monitor',
        '/broken-links-checker',
        '/dummy-content-checker',
        '/image-alt-text-checker',
        '/keyword-rank-checker',
        '/keyword-research',
        '/keyword-research-tool',
        '/keyword-insights',
        '/link-analyzer',
        '/accounts/:path*',
        '/campaign-activity/:path*',
        '/project-details',
        '/campaign-activity-new',
        '/project-task-overview',
        '/task-templates',
        '/team-performance-board',
        '/team-analytics',
        '/team-management',
        '/backlink-insights',
        '/backlink-audit',
        '/backlink-health-monitor',
        '/roles-management',
        '/home',
        '/access-engagement',
        '/user-activity',
        '/organic-visibility',
        '/project-overview',
        '/competitor-intelligence',
        
    ],
};
