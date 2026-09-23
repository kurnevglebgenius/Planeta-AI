import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Planeta AI",
  description: "Внутренняя система Planeta AI",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
