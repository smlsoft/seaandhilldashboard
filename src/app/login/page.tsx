'use client';

import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[hsl(var(--background))]">
      {/* Background gradient mesh */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Primary orb — top left */}
        <div className="absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-[hsl(243,75%,59%)] opacity-[0.18] blur-[100px]" />
        {/* Secondary orb — bottom right */}
        <div className="absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full bg-[hsl(243,75%,59%)] opacity-[0.15] blur-[100px]" />
        {/* Accent orb — center */}
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(199,89%,48%)] opacity-[0.10] blur-[80px]" />
        {/* Small accent — top right */}
        <div className="absolute -top-20 right-[20%] h-[280px] w-[280px] rounded-full bg-violet-500 opacity-[0.12] blur-[70px]" />
        {/* Small accent — bottom left */}
        <div className="absolute bottom-[10%] left-[10%] h-[220px] w-[220px] rounded-full bg-sky-500 opacity-[0.10] blur-[60px]" />
      </div>

      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between px-16 py-12 relative">
        {/* Top logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(243,75%,59%)]">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">MIS Dashboard</span>
        </div>

        {/* Center content */}
        <div className="space-y-8 max-w-lg">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(243,75%,59%)]/30 bg-[hsl(243,75%,59%)]/10 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[hsl(243,75%,59%)] animate-pulse" />
            <span className="text-xs font-medium text-[hsl(243,75%,59%)]">ระบบจัดการข้อมูลธุรกิจ</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-bold leading-[1.15] tracking-tight text-[hsl(var(--foreground))]">
              ข้อมูลธุรกิจ<br />
              <span className="bg-gradient-to-r from-[hsl(243,75%,59%)] to-[hsl(199,89%,48%)] bg-clip-text text-transparent">
                ในมือผู้บริหาร
              </span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              รวมข้อมูลยอดขาย บัญชี สินค้าคงคลัง และรายงานธุรกิจแบบ Real-time
              ครบในที่เดียว
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "ยอดขาย", sublabel: "Real-time" },
              { label: "กิจการ", sublabel: "เปรียบเทียบ" },
              { label: "AI", sublabel: "วิเคราะห์" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/60 backdrop-blur-sm p-4 space-y-1"
              >
                <p className="text-lg font-bold text-[hsl(243,75%,59%)]">{stat.label}</p>
                <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <p className="text-xs text-muted-foreground">
          © 2026 Sea & Hill · ข้อมูลทั้งหมดเป็นความลับ
        </p>
      </div>

      {/* Right panel — login */}
      <div className="flex w-full lg:w-[45%] items-start justify-center px-5 py-10 sm:px-8 sm:py-14 md:items-center relative">
        {/* Vertical divider (desktop only) */}
        <div className="absolute left-0 top-[10%] hidden h-[80%] w-px bg-gradient-to-b from-transparent via-[hsl(var(--border))] to-transparent lg:block" />

        <div className="w-full max-w-[420px] md:max-w-[440px] lg:max-w-[360px] space-y-6">

          {/* ── Branding (mobile + tablet only, hidden on desktop) ── */}
          <div className="lg:hidden space-y-5">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(243,75%,59%)]">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-base font-bold text-[hsl(var(--foreground))]">MIS Dashboard</span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(243,75%,59%)]/30 bg-[hsl(243,75%,59%)]/10 px-3 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[hsl(243,75%,59%)] animate-pulse" />
                <span className="text-xs font-medium text-[hsl(243,75%,59%)]">ระบบจัดการข้อมูลธุรกิจ</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-[hsl(var(--foreground))]">
                ข้อมูลธุรกิจ{" "}
                <span className="bg-gradient-to-r from-[hsl(243,75%,59%)] to-[hsl(199,89%,48%)] bg-clip-text text-transparent">
                  ในมือผู้บริหาร
                </span>
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                รวมข้อมูลยอดขาย บัญชี สินค้าคงคลัง และรายงานธุรกิจ Real-time ครบในที่เดียว
              </p>
            </div>

            {/* Feature chips (tablet: show in a row, mobile: wrap) */}
            <div className="flex flex-wrap gap-2">
              {[
                { emoji: "📊", label: "ยอดขาย Real-time" },
                { emoji: "🔀", label: "เปรียบเทียบสาขา" },
                { emoji: "🤖", label: "AI วิเคราะห์" },
              ].map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs text-[hsl(var(--foreground))]"
                >
                  {f.emoji} {f.label}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-[hsl(var(--border))]" />
          </div>

          {/* ── Login Card ── */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
            {/* Header */}
            <div className="mb-7 space-y-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(243,75%,59%)] to-[hsl(243,75%,45%)] shadow-lg shadow-[hsl(243,75%,59%)]/25">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="mt-3 text-xl font-bold text-[hsl(var(--foreground))]">
                ยินดีต้อนรับ
              </h2>
              <p className="text-sm text-muted-foreground">
                เข้าสู่ระบบด้วยบัญชี Google ของคุณ
              </p>
            </div>

            {/* Divider */}
            <div className="mb-5 h-px bg-[hsl(var(--border))]" />

            {/* Google button */}
            <button
              onClick={() =>
                signIn.social({ provider: "google", callbackURL: "/" })
              }
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm transition-all duration-200 hover:border-[hsl(243,75%,59%)]/60 hover:bg-[hsl(243,75%,59%)]/5 hover:shadow-md active:scale-[0.98]"
            >
              {/* Shimmer on hover */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Footer note */}
            <div className="mt-6 flex items-start gap-2 rounded-lg bg-[hsl(var(--muted))]/50 px-3 py-2.5">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                เฉพาะบัญชีที่ได้รับอนุญาตจากผู้ดูแลระบบเท่านั้น
              </p>
            </div>
          </div>

          {/* Footer (mobile/tablet only) */}
          <p className="text-center text-[11px] text-muted-foreground lg:hidden">
            &copy; 2026 Sea &amp; Hill &middot; ข้อมูลทั้งหมดเป็นความลับ
          </p>

        </div>
      </div>
    </div>
  );
}
