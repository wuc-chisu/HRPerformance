export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    // Skip Next.js internals and static files, but always evaluate API requests.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
