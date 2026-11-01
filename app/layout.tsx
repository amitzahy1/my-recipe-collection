import type { Metadata } from "next";
export const metadata:Metadata={title:"My Recipe Collection",description:"פיד המתכונים האישי שלך"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="he" dir="rtl"><body>{children}</body></html>;}
