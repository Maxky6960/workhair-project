import { redirect } from "next/navigation";
import { HomePage } from "@/components/HomePage";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;

  if (typeof error === "string" && error) {
    const params = new URLSearchParams();
    params.set("error", error);

    for (const key of ["error_code", "error_description"]) {
      const value = resolvedSearchParams?.[key];
      if (typeof value === "string" && value) params.set(key, value);
    }

    redirect(`/login?${params.toString()}`);
  }

  return <HomePage />;
}
