import Image from "next/image";
import { IconBuilding } from "@/components/icons";

// Um componente, 3 pontos de uso (card da lista, sidebar, cabeçalho da
// Home) — antes todos mostravam só o mesmo ícone `IconBuilding` fixo, sem
// nenhum campo de logo na organização. `size` controla altura/largura do
// slot (em px) para caber exatamente onde o ícone estava antes.
export function OrganizationLogo({
  logoUrl,
  name,
  size = 44,
  className = "",
}: {
  logoUrl: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const baseClass = `flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-600/30 ${className}`;

  if (!logoUrl) {
    return (
      <span className={baseClass} style={{ width: size, height: size }}>
        <IconBuilding className="h-1/2 w-1/2" />
      </span>
    );
  }

  return (
    <span className={baseClass} style={{ width: size, height: size }}>
      <Image
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        sizes={`${size}px`}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
