"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** `/admin` sozinho não é uma tela — redireciona pra primeira seção. */
export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/organizations");
  }, [router]);
  return null;
}
