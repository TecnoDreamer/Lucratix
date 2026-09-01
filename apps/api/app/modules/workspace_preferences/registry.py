# Allow-list dos ids de card validos — o registro completo (rota, titulo,
# icone, papel minimo) vive no FRONTEND (apps/web/src/lib/quick-access.ts).
# O backend so precisa saber quais ids sao legitimos, para rejeitar um
# payload com id desconhecido/inventado (422) sem precisar espelhar rota,
# copy ou icone aqui. Ao adicionar um card novo, atualize as DUAS listas
# (aqui e em lib/quick-access.ts) — comentario cruzado nos dois arquivos.
QUICK_ACCESS_CARD_IDS: frozenset[str] = frozenset(
    {
        "analytics",
        "financials",
        "marketing",
        "funnel",
        "products",
        "experiments",
        "central-de-dados",
    }
)
