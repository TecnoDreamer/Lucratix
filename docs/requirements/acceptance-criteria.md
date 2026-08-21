# Critérios de Aceite (Given/When/Then)

Cobre os requisitos funcionais mais críticos ao MVP (P0). Cada bloco referencia o RF correspondente.

## RF-001 — Cadastro de usuário
```
Given um visitante com e-mail ainda não cadastrado
When ele envia nome, e-mail e senha válidos
Then o sistema cria o usuário com a senha armazenada como hash
And o sistema não retorna a senha em nenhuma resposta

Given um e-mail já cadastrado
When alguém tenta se cadastrar novamente com esse e-mail
Then o sistema recusa o cadastro
And a mensagem de erro não confirma explicitamente que o e-mail já existe de forma a permitir enumeração trivial
```

## RF-002 — Login
```
Given um usuário com conta ativa e senha correta
When ele envia e-mail e senha corretos
Then o sistema autentica e retorna uma sessão/token válido

Given um usuário que envia e-mail inexistente ou senha incorreta
When ele tenta autenticar
Then o sistema recusa o acesso com uma mensagem genérica de credenciais inválidas
And não diferencia "e-mail não existe" de "senha incorreta"
```

## RF-007 / RF-009 / RF-010 — Organização e isolamento (o requisito mais crítico do produto)
```
Given dois usuários, A (membro apenas da Organização X) e B (membro apenas da Organização Y)
When o usuário A lista suas empresas
Then a Organização Y não aparece na lista

Given o usuário A autenticado e com a Organização X selecionada
When o usuário A tenta acessar, por API, um recurso (baseline, financeiro, campanha, funil, métrica, auditoria) pertencente à Organização Y usando o ID do recurso diretamente
Then o sistema retorna 403 ou 404 (a decidir em ADR) e NÃO retorna o dado da Organização Y
```

## RF-013 / RF-014 — Baseline versionado
```
Given uma organização que já possui um baseline registrado
When um usuário autorizado registra um novo baseline
Then o sistema cria um novo registro, mantendo o anterior consultável no histórico
And o baseline anterior não é alterado nem removido
```

## RF-021 — Motor de métricas: divisão por zero e dado ausente
```
Given uma organização sem nenhum investimento em marketing registrado no período
When o sistema calcula o CAC desse período
Then o resultado exibido é "não aplicável", nunca "0" e nunca um erro não tratado

Given uma organização com investimento em marketing registrado mas sem nenhum cliente novo no período
When o sistema calcula o CAC desse período
Then o sistema decide e documenta explicitamente (ver metrics-catalog.md) se o resultado é "não aplicável" ou um valor válido, mas nunca lança exceção não tratada para o usuário
```

## RF-022 — Comparação antes × depois
```
Given uma organização com baseline registrado e dados do período atual
When um usuário solicita a comparação baseline × atual para a métrica "receita"
Then o sistema retorna valor do baseline, valor atual, variação absoluta e variação percentual
And a interface não afirma que a variação foi causada pelas ações de marketing sem qualificação
```

## RF-025 — Experimento não declara vencedor automaticamente
```
Given um experimento com duas variantes e poucas conversões registradas
When o resultado é exibido
Then o sistema não rotula nenhuma variante como "vencedora" apenas pela diferença percentual bruta
And o sistema exibe os números junto de uma indicação de que o critério de significância não foi (ainda) aplicado, quando for o caso
```

## RNF-002 (transversal) — Nenhuma query sem filtro de organização
```
Given qualquer endpoint que retorna dado de organização
When o código da rota é revisado ou testado
Then a query ao banco inclui filtro por organization_id derivado da sessão do usuário
And existe teste de integração cobrindo a tentativa de acesso cruzado (ver RF-007/009/010 acima)
```
