import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";

const mockUser = {
  id: 0,
  nom: "Demo User",
  email: "demo@groupe-echo.fr",
  pole: "Direction",
  avatar: "DU",
  color: "#C5A55A",
  role: "admin" as const,
  base: 0,
  actif: true,
};

export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider>
      <AuthProvider initialUser={mockUser}>
        <div className="min-h-screen bg-blanc">
          <Sidebar />
          <main className="app-main">
            <div style={{ padding: "20px 32px" }}>
              {children}
            </div>
          </main>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
