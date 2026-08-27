import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server Component: decide para onde ir sem nenhum JS de cliente nem round-trip
 * de rede — antes, esta rota baixava o bundle, hidratava e só então chamava
 * `/auth/me` para decidir o destino (ver docs/auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md).
 *
 * Só verifica a presença do cookie `refresh_token` (7 dias), não sua validade —
 * uma sessão expirada/revogada ainda cai em `/organizations`, que já trata 401
 * redirecionando para `/login` (mesmo padrão usado em toda a área autenticada).
 * O caso de API fora do ar passa a ser tratado pela página de destino (mesmo
 * `Alert` de erro que ela já mostra para qualquer outra falha de rede), não
 * mais por uma tela dedicada aqui.
 */
export default async function Home() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("refresh_token");
  redirect(hasSession ? "/organizations" : "/login");
}
