# User Stories

Formato: `Como <persona>, eu quero <ação>, para que <benefício>`. Cada história referencia o(s) RF(s) correspondente(s) — ver [personas.md](../product/personas.md) para os perfis citados.

## Autenticação

- **US-01.** Como usuário, eu quero me cadastrar com e-mail e senha, para que eu possa acessar a plataforma. (RF-001)
- **US-02.** Como usuário, eu quero fazer login, para que eu possa acessar os dados das empresas às quais tenho acesso. (RF-002)
- **US-03.** Como usuário, eu quero fazer logout, para que minha sessão não fique aberta em um dispositivo compartilhado. (RF-003)
- **US-04.** Como usuário, eu quero recuperar minha senha caso a esqueça, para que eu não perca acesso permanentemente à minha conta. (RF-004)

## Organizações

- **US-05.** Como consultor(a), eu quero cadastrar uma nova empresa/cliente, para que eu possa começar a acompanhar seus dados isoladamente. (RF-007)
- **US-06.** Como consultor(a) que atende várias empresas, eu quero ver a lista de empresas às quais tenho acesso e trocar entre elas, para que eu não misture dados de clientes diferentes. (RF-009, RF-010)
- **US-07.** Como dono(a) da consultoria, eu quero convidar um(a) analista para uma empresa específica com um papel definido, para que a equipe colabore sem acesso indevido a outras empresas. (RF-011, RF-012)

## Baseline

- **US-08.** Como analista, eu quero registrar a situação da empresa antes do início do serviço, para que eu tenha uma referência confiável para comparação futura. (RF-013)
- **US-09.** Como consultor(a), eu quero ver o histórico de baselines registrados, para que eu entenda se e quando a referência inicial foi ajustada. (RF-014)

## Produtos e Financeiro

- **US-10.** Como analista, eu quero cadastrar os produtos/serviços do cliente com preço e custo, para que eu saiba a margem de cada um. (RF-015)
- **US-11.** Como analista, eu quero registrar receita, custos, despesas e investimento em marketing por período, para que o sistema calcule lucro e margem automaticamente. (RF-017)

## Marketing e Funil

- **US-12.** Como analista, eu quero registrar campanhas por canal com investimento e resultado, para que eu identifique quais canais trazem clientes mais lucrativos. (RF-018, RF-019)
- **US-13.** Como analista, eu quero registrar os números de cada etapa do funil por período, para que eu identifique onde estão os gargalos de conversão. (RF-020)

## Métricas e Dashboard

- **US-14.** Como consultor(a), eu quero ver um dashboard com as principais métricas (CAC, ROAS, LTV, conversão, ticket médio, lucro, margem), para que eu tenha uma visão executiva rápida da saúde do cliente. (RF-021, RF-023)
- **US-15.** Como consultor(a), eu quero comparar o período atual com o baseline e com o período anterior, para que eu possa demonstrar evolução ao cliente sem exagerar o que os dados realmente mostram. (RF-022)

## Experimentos

- **US-16.** Como analista, eu quero registrar um experimento de CRO com hipótese e variantes, para que eu documente o que foi testado e por quê. (RF-024)
- **US-17.** Como analista, eu quero registrar o resultado de um experimento sem que o sistema declare um vencedor precipitadamente, para que eu não tome decisão baseada em ruído estatístico. (RF-025)

## Relatórios e Auditoria

- **US-18.** Como consultor(a), eu quero gerar um relatório básico por período, para que eu possa apresentar o resultado ao cliente final. (RF-026)
- **US-19.** Como dono(a) da consultoria, eu quero consultar quem alterou o quê e quando nos dados de uma empresa, para que eu tenha rastreabilidade em caso de dúvida ou disputa. (RF-027)
