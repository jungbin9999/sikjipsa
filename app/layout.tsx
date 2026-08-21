import type { Metadata } from "next";
import PhoneFrame from "@/components/PhoneFrame";
import "./globals.css";

export const metadata: Metadata = {
  title: "식집사 — 날씨를 아는 AI 식물집사",
  description: "초보 식집사를 위한 물주기·분갈이·화분위치 케어 앱",
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
