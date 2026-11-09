import { LoginForm } from "../../login-form";

/** The proxy puts the page the visitor asked for in `?redirect=`. */
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const { redirect } = await searchParams;
  return (
    <LoginForm redirect={typeof redirect === "string" ? redirect : undefined} />
  );
}
