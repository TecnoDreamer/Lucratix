# Backlog de oportunidades competitivas

> Converte a pesquisa em **itens priorizáveis** — sem implementar nada e sem tratar "o concorrente tem" como justificativa. Origem: [`docs/competitive/`](../competitive/README.md) (gaps `G-xx`, oportunidades, SWOT) e [`LACUNAS_ENCONTRADAS.md`](../governanca/LACUNAS_ENCONTRADAS.md) (`L-xx`). Data: 2026-09-18.
> Horizontes: [`ROADMAP-COMPETITIVO.md`](ROADMAP-COMPETITIVO.md).

## 1. Método de priorização: ICE, com regras anti-manipulação

**Por que ICE e não RICE:** RICE exige **Alcance** (quantos usuários), e o produto **não tem usuários nem entrevistas** — inventar alcance seria manipular o score. ICE troca alcance por **Confiança**, que **penaliza hipótese sem evidência**, o que descreve bem o estado atual.

`ICE = Impacto × Confiança × Facilidade` (cada um de 1 a 5; máximo 125).

| Nota | Impacto (efeito no objetivo do produto) | Confiança (quão sustentado por **evidência**) | Facilidade (esforço relativo) |
|---|---|---|---|
| 5 | Muda a viabilidade do produto | Provado por código/teste/fonte oficial | Pequena, sem dependências |
| 4 | Grande ganho ao público-alvo | Forte indício direto | Pequena-média |
| 3 | Ganho moderado | Indício indireto ou 1 fonte | Média |
| 2 | Ganho pequeno | **Hipótese** de demanda, sem validação | Grande |
| 1 | Marginal | Só intuição | Muito grande / exige decisão externa |

**Regras para não manipular o resultado:**
1. **Confiança ≤ 2** para qualquer item cujo valor depende de **demanda ainda não validada** com usuários. Consequência aritmética assumida: um item com C = 2 não passa de **50** (5×2×5) — **nunca** alcança o horizonte "Agora" (≥ 60) enquanto for hipótese. Isso é **propriedade do método**, não coincidência.
2. **Confiança ≥ 4** somente com prova no repositório (código, teste, documento) ou fonte oficial datada.
3. Cada nota traz **justificativa de uma linha** (seção 3). Nota sem justificativa não vale.
4. **Empate** é resolvido por **dependência**: o que destrava outros vem primeiro.
5. **Recalcular** quando a evidência mudar (ex.: após o discovery, a Confiança de itens de demanda pode subir **ou** cair).
6. O score **ordena**; não decide sozinho — itens "gated" (que dependem de decisão do responsável) são marcados.

Faixas de horizonte: **Agora** ≥ 60 · **Próximo** 30–59 · **Depois** 10–29 · **Explorar** < 10.

## 2. Itens (campos do prompt §22)

### 2.1 Identificação e evidência

| ID | Título | Categoria | Problema | Evidência / Fonte | Persona | Hipótese |
|---|---|---|---|---|---|---|
| **B-01** | Tela de equipe para o admin da empresa | UX / funcionalidade | O admin da empresa não convida nem gerencia membros pela interface | Matriz de maturidade §3 (API pronta, sem consumidor no front); G-03 | Consultor(a)/dono(a) | Sem isso, não há demo honesta nem portal do cliente |
| **B-02** | Discovery com usuários (roteiro pronto) | Pesquisa | Nenhuma evidência de demanda; hipóteses H-D1…H-D8 abertas | [`07`](../competitive/07-ROTEIRO-DISCOVERY-MERCADO.md); G-15; `problem.md` sem pesquisa formal | P1–P5 | O problema e o público existem como descritos |
| **B-03** | Capturas de tela + decisão do showcase (A/B/C) | Documentação | Portfólio sem imagens; repositório privado | [`SCREENSHOT-PLAN.md`](../portfolio/SCREENSHOT-PLAN.md); [`GITHUB-SHOWCASE.md`](../portfolio/GITHUB-SHOWCASE.md); G-16 | Autor/recrutadores | Imagens e vitrine aumentam a credibilidade |
| **B-04** | Onboarding: planilha-modelo, dados de exemplo opcionais, estados vazios guiados | UX / onboarding | Tempo até o primeiro valor alto por causa do dado manual | Onboarding dos concorrentes (S31); G-04 | Analista; novo usuário | O atrito está no preparo dos dados |
| **B-05** | Auditoria de acessibilidade (axe + Lighthouse) e correções | UX / qualidade | WCAG não verificada; sem ferramenta automatizada | Matriz §4; G-11 | Todos | Há problemas simples de corrigir |
| **B-06** | Observabilidade mínima (logs estruturados, erros, métricas básicas) | Dívida técnica | Só existe `/health`; diagnosticar produção é cego | Matriz §4; G-10 | Operação | Necessária antes de piloto |
| **B-07** | Hardening para piloto com dado real (rotação de refresh, MFA, rate limit distribuído) | Segurança | Lacunas conhecidas de segurança | L-13; `MFA.md`; G-12 | Todos | Exigível antes de dado real |
| **B-08** | Exclusão/exportação self-service de dados pessoais (LGPD) | Segurança / conformidade | Só processo manual | Issue #25; G-13 | Titulares de dados | Bloqueia piloto com dado pessoal |
| **B-09** | Decidir L-02/L-21, L-06, L-07, L-08 (campos/funções sem uso) | Correção / decisão | Coleta e código sem efeito confundem o usuário | [`LACUNAS_ENCONTRADAS.md`](../governanca/LACUNAS_ENCONTRADAS.md); G-17 | Consultor; mantenedor | Resolver reduz ruído e promessa falsa |
| **B-10** | Sinalização de metas na Home e lembrete de fechamento de mês | Analytics / UX | Desvio de meta só aparece abrindo o painel | Reportei Controle (S01, 1 fonte); G-06 | Consultor | Ajuda sem exigir dado em tempo real |
| **B-11** | Variações de relatório por audiência ("versão cliente final") | Funcionalidade | 3 PDFs fixos | Templates dos concorrentes (S04); G-05 | Consultor | Valor de reporte ao cliente |
| **B-12** | Painel do `VIEWER` com logo da empresa; depois marca própria | Funcionalidade | Cliente final sem visão com identidade da consultoria | White-label dos concorrentes (S04–S06, S33); G-02 | Cliente final; consultor | Portal com marca é padrão para o público |
| **B-13** | Template/guia Looker Studio e Power BI sobre a chave de API | Integração | BI externo possível mas sem material pronto | Kondado/Metricool (S08, S11); G-09 | Usuários de BI | Reduz barreira ao BI externo |
| **B-14** | 1–2 conectores de maior demanda (Ads/GA4), **ou** caminho complementar via pipeline | Integração | Sem integrações automáticas | 4/4 concorrentes (S01–S06); G-01; issue #26 | Analista | Só entra após validar H-D7 |
| **B-15** | Estudo de IA **descritiva** com salvaguardas | Pesquisa / analytics | Expectativa de IA no mercado; risco com RN-007 | 4/4 anunciam IA (S01–S07); G-07 | Consultor | IA descritiva agrega sem afirmar causa |
| **B-16** | Envio de relatório com lembrete de atualização (em vez de agendamento cego) | Funcionalidade | Reporte recorrente manual | Reportei, mLabs (S01, S04); G-08 | Consultor | Ajuda sem enviar dado defasado |
| **B-17** | Controle de acesso por módulo (empresa e usuário) | Funcionalidade / modelo | Só há papéis lineares | Desenho existente; HP-2 | Consultor; admin | Há segmentos que usam só parte do produto |
| **B-18** | Cobrança e planos | Comercial | Sem billing | G-14; [`12`](../competitive/12-HIPOTESES-DE-PLANOS.md) | Comprador | Só faz sentido com demanda provada |
| **B-19** | Teste de usabilidade do fluxo "primeiro valor" (spike) | Pesquisa / UX | Não se sabe onde o novo usuário trava | G-04; P2 do benchmark UX | Novo usuário | Localiza o atrito antes de construir B-04 |

### 2.2 Valor, priorização e critérios

| ID | Valor esperado | I | C | F | **ICE** | Risco | Dependências | Critério de sucesso | Horizonte | Status |
|---|---|:-:|:-:|:-:|:-:|---|---|---|---|---|
| **B-01** | Destrava demo honesta e o portal do cliente | 4 | 5 | 4 | **80** | Baixo (regras de papel já existem) | Nenhuma | Admin convida, troca papel e revoga pela UI, com testes de API/E2E | **Agora** | Proposto |
| **B-02** | Transforma hipóteses em evidência | 5 | 4 | 3 | **60** | Viés de amostra; recrutamento | Autorização do responsável para contatar pessoas | ≥ 5 conversas por perfil P1 e P3, hipóteses com estado e contagem | **Agora** | Proposto |
| **B-03** | Credibilidade do portfólio | 3 | 5 | 4 | **60** | Exposição de dado se mal executado | Docker ativo; autorização para publicar | 21 capturas aprovadas no checklist; decisão A/B/C registrada | **Agora** | Proposto |
| **B-05** | Base para dizer algo sobre acessibilidade | 3 | 5 | 4 | **60** | Baixo | Nenhuma | Relatório axe/Lighthouse das telas principais e achados corrigidos | **Agora** | Proposto |
| **B-19** | Localiza o atrito do primeiro valor | 4 | 3 | 4 | **48** | Poucos participantes | B-02 (participantes) | ≥ 5 observações cronometradas com pontos de travamento listados | Próximo | Proposto |
| **B-04** | Reduz tempo até o primeiro valor | 4 | 3 | 4 | **48** | Otimizar o passo errado | **B-19** | Tempo/passos até o 1º painel medidos antes e depois | Próximo | Proposto |
| **B-09** | Remove promessa sem efeito | 2 | 5 | 4 | **40** | Baixo | **Decisão do responsável** (não é técnica) | 4 decisões registradas e executadas | Próximo | **Gated** (decisão) |
| **B-06** | Diagnóstico de produção | 3 | 4 | 3 | **36** | Custo/ruído | Definir ferramenta | Logs estruturados e alerta de erro em ambiente de teste | Próximo | Proposto |
| **B-08** | Habilita dado pessoal real | 4 | 4 | 2 | **32** | Regulatório | Decisão jurídica/processo | Fluxo de exclusão/exportação testado | Próximo | Proposto |
| **B-07** | Habilita piloto | 3 | 4 | 2 | **24** | MFA é grande | B-06 | Refresh rotativo, MFA para papéis privilegiados, limitador distribuído | Depois | Proposto — **gate de piloto** |
| **B-10** | Antecipa desvio | 2 | 2 | 5 | **20** | Sinal sem valor | B-02 | Sinalização visível e testada; uso observado | Depois | Hipótese |
| **B-11** | Relatório para o cliente final | 3 | 2 | 3 | **18** | Escopo de editor | B-02 | Versão cliente final gerada e aprovada por usuários | Depois | Hipótese |
| **B-13** | Reduz barreira ao BI externo | 3 | 2 | 3 | **18** | Duas superfícies | B-02 | Template publicado e usado por ≥ 1 usuário externo | Depois | Hipótese |
| **B-12** | Portal do cliente com identidade | 4 | 2 | 2 | **16** | Escopo; domínio próprio | **B-01**, B-02 | `VIEWER` vê painel com logo; depois marca própria | Depois | Hipótese |
| **B-15** | Avalia IA sem quebrar RN-007 | 3 | 2 | 2 | **12** | Contradizer o princípio; privacidade | Política de uso de IA | Documento de decisão com salvaguardas | Depois | Hipótese |
| **B-16** | Reporte com menos esforço | 2 | 2 | 3 | **12** | Dado defasado | B-14 (para automatizar de verdade) | Envio manual com lembrete implantado | Depois | Hipótese |
| **B-17** | Pacotes por módulo | 3 | 1 | 2 | **6** | Complexidade sem demanda | B-02 | Só se ≥ 3 entrevistados usarem parte do produto | Explorar | Hipótese |
| **B-14** | Paridade em integrações | 4 | 1 | 1 | **4** | Manutenção contínua | **B-02 (H-D7)**; segurança de credenciais | Só após validar que importação **não** basta | Explorar | **Gated** (validação; issue #26 bloqueada) |
| **B-18** | Receita | 4 | 1 | 1 | **4** | Construir sem comprador | B-02, B-17 | Só após disposição a pagar comprovada | Explorar | **Gated** (validação) |

## 3. Justificativa das notas (uma linha por item)

- **B-01** — I4: bloqueia demo e portal; C5: API pronta e lacuna comprovada na matriz; F4: só frontend + testes.
- **B-02** — I5: sem isso todo o resto é palpite; C4: roteiro pronto, método conhecido; F3: exige recrutar e conduzir conversas.
- **B-03** — I3: credibilidade, não capacidade; C5: plano pronto; F4: execução mecânica com dados demo.
- **B-05** — I3: risco e credibilidade; C5: ausência comprovada; F4: ferramentas prontas.
- **B-19** — I4: guia B-04; C3: 1 fonte de onboarding e nenhuma observação do próprio produto; F4: teste simples.
- **B-04** — I4: hipótese central de atrito; C3: ainda sem observação; F4: templates e estados vazios.
- **B-09** — I2: clareza, sem ganho de capacidade; C5: evidência no código; F4: pequenas mudanças — mas exige decisão.
- **B-06** — I3: pré-requisito de operação; C4: lacuna comprovada; F3: escolha de ferramenta e integração.
- **B-08** — I4: bloqueia dado real; C4: issue aberta; F2: envolve processo e fluxo.
- **B-07** — I3; C4: lacunas documentadas; F2: MFA e limitador distribuído são grandes.
- **B-10** — I2; C2: 1 fonte e hipótese de demanda; F5: pequeno.
- **B-11 / B-13 / B-12** — C2: hipóteses de demanda; F conforme escopo.
- **B-15 / B-16** — C2: demanda e riscos não validados.
- **B-17 / B-14 / B-18** — C1: dependem de decisão externa ou de validação inexistente; F1–F2: grandes.

## 4. Sensibilidade (para não confiar cegamente no número)

- Se o discovery **confirmar** H-D7 negativamente (importação **não** basta), B-14 sobe (C→4) e passa para o topo do "Próximo".
- Se confirmar H-D1/H-D6, itens de posicionamento (B-11, B-12, B-13) ganham confiança.
- Se **refutar** H-D1 (consultorias não têm essa dor), **todo o posicionamento P-A** cai — e o backlog precisa ser refeito, não ajustado.

## 5. Fora deste backlog

Itens que **não** foram gerados por concorrência e já têm destino: melhorias do Funil/Analytics em andamento, decisões L-xx e demais issues do repositório. Este backlog **não** os substitui.
