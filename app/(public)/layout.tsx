import { Navbar, Footer } from "@/components/homepage"
import { SmartsuppChat } from "@/components/user/SmartsuppChat"
import { GTranslate } from "@/components/GTranslate"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {/* Safe Haven Private type system — General Sans (UI), Newsreader (display), Spline Sans Mono (amounts) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link
        href="https://api.fontshare.com/v2/css?f[]=general-sans@300,400,500&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&family=Spline+Sans+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <Navbar />
      <main>{children}</main>
      <Footer />
      <SmartsuppChat />
      <GTranslate />
    </div>
  )
}
