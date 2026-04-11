import { redirect } from "next/navigation";

function hasAuthParams(searchParams: Record<string, string | string[] | undefined>) {
  return [
    "code",
    "token_hash",
    "type",
    "error",
    "error_code",
    "error_description",
  ].some((key) => searchParams[key] !== undefined);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  if (hasAuthParams(resolvedSearchParams)) {
    const params = new URLSearchParams();

    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item));
      } else if (typeof value === "string") {
        params.set(key, value);
      }
    });

    const suffix = params.toString();
    redirect(suffix ? `/auth/callback?${suffix}` : "/auth/callback");
  }

  redirect("/dashboard");
}
