import { NextResponse } from "next/server";

const SVG_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#09090b"/>
  <path
    d="M22 45.5a4.5 4.5 0 0 1-4.5-4.5v-3h3v3a1.5 1.5 0 0 0 3 0v-18a4.5 4.5 0 0 1 9 0v3h-3v-3a1.5 1.5 0 0 0-3 0v18a4.5 4.5 0 0 1-4.5 4.5Zm21 0a4.5 4.5 0 0 1-4.5-4.5v-3h3v3a1.5 1.5 0 0 0 3 0v-18a4.5 4.5 0 0 1 9 0v3h-3v-3a1.5 1.5 0 0 0-3 0v18a4.5 4.5 0 0 1-4.5 4.5ZM14 27.5h10v3H14Zm26 0h10v3H40Z"
    fill="#fafafa"
  />
</svg>
`;

export function GET() {
  return new NextResponse(SVG_ICON, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
