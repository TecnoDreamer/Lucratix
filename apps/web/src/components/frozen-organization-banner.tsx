import { useTranslations } from "next-intl";
import { IconAlertCircle } from "@/components/icons";

/** Não-bloqueante: aparece em toda sub-página quando a empresa está
 * encerrada, mas nunca esconde/substitui o conteúdo — leitura e histórico
 * continuam acessíveis (requisito explícito: congelar nunca vira 404 nem
 * bloqueia leitura). Uma escrita de verdade ainda mostra o 409 do backend
 * através do tratamento de erro que cada página já tem. */
export function FrozenOrganizationBanner({ closureReason }: { closureReason?: string | null }) {
  const t = useTranslations("orgSettings.frozenBanner");
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
      <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">{t("title")}</p>
        <p className="mt-0.5">
          {t("description")}
          {closureReason ? ` ${t("reasonPrefix")}: ${closureReason}` : ""}
        </p>
      </div>
    </div>
  );
}
