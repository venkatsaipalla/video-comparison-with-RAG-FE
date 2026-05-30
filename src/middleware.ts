import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const loggedIn = !!req.auth;
  const isLogin = req.nextUrl.pathname.startsWith("/login");

  if (!loggedIn && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (loggedIn && isLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
