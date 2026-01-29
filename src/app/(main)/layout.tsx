import { MainLayout } from "@/components/MainLayout";
import { PermissionProvider } from "@/lib/permissions";
import ChatWidget from "@/components/ChatWidget";

export default function MainGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionProvider>
      <MainLayout>
        {children}
      </MainLayout>
      <ChatWidget />
    </PermissionProvider>
  );
}
