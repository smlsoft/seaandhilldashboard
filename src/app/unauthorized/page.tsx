import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[hsl(var(--background))] text-center">
      <div className="max-w-sm space-y-4">
        <div className="text-5xl">🚫</div>
        <h1 className="text-2xl font-bold text-rose-600">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-sm text-muted-foreground">
          ข้อขออภัย — อีเมลนี้ไม่ได้รับอนุญาตให้เข้าใช้งาน Dashboard
          <br />
          กรุณาติดต่อผู้ดูแลระบบ
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-blue-600 hover:underline"
        >
          ← กลับหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
