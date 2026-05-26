import { LoginPage } from "@/components/LoginPage";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const safeNextPath = (value?: string | string[]) => {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
};

const getErrorMessage = (searchParams?: Record<string, string | string[] | undefined>) => {
  const errorCode = searchParams?.error_code;
  const description = searchParams?.error_description;

  if (errorCode === "otp_expired") {
    return "ลิงก์ยืนยันอีเมลหมดอายุ กรุณาสมัครใหม่หรือขอส่งอีเมลยืนยันอีกครั้ง";
  }

  if (typeof description === "string" && description) {
    return description;
  }

  if (typeof searchParams?.error === "string" && searchParams.error) {
    return "ยืนยันอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }

  return null;
};

const getStringParam = (value?: string | string[]) => {
  return typeof value === "string" ? value : null;
};

const getSuccessMessage = (searchParams?: Record<string, string | string[] | undefined>) => {
  return searchParams?.registered === "1" ? "สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ" : null;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <LoginPage
      initialErrorMessage={getErrorMessage(resolvedSearchParams)}
      initialSuccessMessage={getSuccessMessage(resolvedSearchParams)}
      initialEmail={getStringParam(resolvedSearchParams?.email)}
      redirectTo={safeNextPath(resolvedSearchParams?.next)}
    />
  );
}
