import Sidebar from "@/components/Sidebar";
import PreviewBar from "@/components/PreviewBar";
import { AuthProvider } from "@/lib/auth-context";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gris">
        <Sidebar />
        <main className="app-main">
          <PreviewBar />
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
