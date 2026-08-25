import type { Metadata } from "next";
import PhoneFrame from "@/components/PhoneFrame";
import "./globals.css";

const TITLE = "식집사 — 날씨를 아는 AI 식물집사";
const DESCRIPTION = "초보 식집사를 위한 물주기·분갈이·화분위치 케어 앱";

export const metadata: Metadata = {
  // 링크 공유 미리보기의 이미지 주소가 절대경로여야 해서 배포 주소를 기준으로 잡는다
  metadataBase: new URL("https://sikjipsa-one.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "식집사",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="antialiased">
      <body>
        <PhoneFrame>{children}</PhoneFrame>
      </body>
    </html>
  );
}
