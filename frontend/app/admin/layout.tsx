import AdminShell from "./admin-shell";

export default async function Layout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
