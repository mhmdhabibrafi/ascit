import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  },
  callbacks: {
    authorized({ token, req }) {
      if (req.nextUrl.pathname === "/scan-qr" && req.nextUrl.searchParams.has("code")) return true;
      return Boolean(token);
    }
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/monitoring/:path*",
    "/scan-qr/:path*",
    "/mutations/:path*",
    "/maintenance/:path*",
    "/repairs/:path*",
    "/warranties/:path*",
    "/asset-age/:path*",
    "/ai-decision-support/:path*",
    "/recommendations/:path*",
    "/reports/:path*",
    "/master-data/:path*",
    "/users/:path*",
    "/audit-log/:path*",
    "/settings/:path*",
    "/assets/:path*",
    "/service-records/:path*",
    "/profile/:path*",
    "/notifications/:path*"
  ]
};
