import { LoginPage } from "@/components/LoginPage";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const safeNextPath = (value?: string | string[]) => {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  return <LoginPage defaultTab="register" redirectTo={safeNextPath(resolvedSearchParams?.next)} />;
}
