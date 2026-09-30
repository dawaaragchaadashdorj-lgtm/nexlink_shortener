import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PowerLink — Холбоосоо хялбарчил",
  description: "Богино холбоос, QR код, нууц үг болон хугацааны тохиргоог нэг дор.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="mn"><body>{children}</body></html>;
}
