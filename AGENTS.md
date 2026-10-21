# Versões da aplicação

O utilizador pediu uma versão visível no formato 1.xx, incrementada sempre que a aplicação é alterada.

- A versão atual tem uma única fonte: `version.json`. Nunca a reduzir.
- Em cada pedido que resulte em alterações à aplicação (HTML, CSS, JavaScript, imagens, configuração ou comportamento), executar `node scripts/bump-version.mjs` uma única vez por entrega, depois de concluir as alterações. Não incrementar por cada ficheiro ou tentativa de reparação na mesma entrega.
- O comando atualiza a versão no topo, os metadados e os identificadores de cache dos scripts e estilos. A sequência é 1.00, 1.01, 1.02, …, 1.99, 2.00.
- Para sincronizar sem incrementar, usar `node scripts/bump-version.mjs --sync`.
- Perguntas, leitura, testes sem mudanças e simples abertura da aplicação não alteram a versão.
- Na entrega, informar sucintamente a nova versão.

# Recortes de iluminação

- As paredes estruturais que delimitam as divisões devem manter a aparência branca do render diurno em todos os modos.
- Os recortes noturnos incluem chão, mobiliário e os pequenos troços de pavimento nos vãos das portas. Nunca ampliar recortes indiscriminadamente sobre paredes/ombreiras.
- As áreas de chão assinaladas pelo utilizador nas portas do corredor e sala correspondem aproximadamente a x=119..190,y=783..805 e x=119..193,y=1034..1063, nas coordenadas originais do render.
- A camada `white-wall-overlay`, recortada por `whiteWallZones`, deve ficar sempre acima de todas as camadas noturnas e usar o render diurno com opacidade 1. Nunca aplicar o estado das luzes a essa camada.
- Existem três renders alinhados: diurno, noite apagada e noite com iluminação elétrica (`planta-noturna-iluminada.png`). Alterações futuras ao mobiliário devem manter os três consistentes. A iluminação elétrica nunca deve substituir a camada permanente de paredes brancas.
- Sempre que uma luz esteja ligada, a camada de iluminação elétrica deve ser visível, mesmo de dia e com estores totalmente abertos. Misturar com luz natural mantendo opacidade elétrica mínima de 45%; não a reduzir a zero enquanto a luz estiver ligada.
- Nomes e posições dos banners são personalizáveis e guardados em `casa-nl-room-layout-v1`. Preservar estas preferências ao repor apenas a demonstração dos equipamentos. Escapar sempre os nomes personalizados ao gerar HTML. O retângulo completo do banner deve permanecer dentro da respetiva divisão durante o arrastamento.

# Cópias de segurança

- Persistir novas configurações da app, incluindo dispositivos e associações Shelly, com chaves `casa-nl-*` (valor JSON). O exportador inclui estas chaves e exclui `casa-nl-weather-v1`; não guardar configurações só no cache meteorológico.
- Atualizar o esquema e testes de `backup-core.js` quando se alterar o formato das configurações obrigatórias. A importação deve validar antes de gravar e preservar o estado anterior em caso de falha.
- A importação restaura configurações locais; nunca deve enviar comandos aos dispositivos como consequência da restauração.

- Durante o dia, a luz natural das divisões com estore é exatamente proporcional à abertura: `abertura / 100`. Com luz elétrica apagada, a opacidade noturna é `1 - abertura / 100`, sem escurecimento residual aos 100%. À noite, os estores não introduzem luz natural.

- Luz diurna indireta: `hall` e `bath2` seguem o estore de `bedroom2`; `bath1` segue o estore de `master`. Usar os IDs estáveis, independentemente dos nomes personalizados, e os valores atuais dos estores para todos os cálculos de luz e legendas. As luzes elétricas continuam independentes.

- Parede entre quartos: o recorte do quarto principal termina em y=470; o do Quarto 2 começa em y=497. As faixas y=467..469 e y=497..501 são chão/remate, devem escurecer. Manter a superfície branca y=470..490 com a máscara permanente da parede; não voltar a deixar margens claras no chão.

- Os recortes ortogonais de iluminação usam `shape-rendering="crispEdges"` e um único path por divisão (incluindo extensões dos vãos), para evitar linhas claras de anti-aliasing nas junções ao redimensionar a planta. Manter os recortes diagonais da varanda e a máscara branca das paredes suavizados.

- Exceção pontual nos vãos para eliminar fugas subpíxel: WC de cima prolonga o recorte até y=369, x=210; corredor prolonga até y=807, x=193. A sala começa em x=119. O início da máscara branca da parede corredor/sala é x=193, pois x=190..193 contém chão. Não eliminar estas pequenas sobreposições de chão nem ampliar a máscara branca sobre esse canto.

- No vão corredor/Quarto 2 (y=502..593), o recorte do Quarto 2 estende-se de x=217 a x=241 para cobrir a junção vertical em x=219 e a ligação ao chão do quarto em x=239. A máscara branca das ombreiras mantém-se acima.

- Os banners dos estores (`.blind-pin`) são independentes dos banners de nomes (`.room-pin`). Mostrar/ocultar com `casa-nl-show-blind-banners`; a ausência da chave significa visíveis. Atualizar nome, percentagem e acessibilidade dos estores durante movimentos e alterações; preservar a preferência na cópia JSON e ao repor a demonstração.

- A junção sala/cozinha fica em y=1080, com sobreposição de chão da cozinha desde y=1078, para evitar linha diurna subpíxel em escalas fracionárias. Em páginas de comparação SVG antes/depois, usar IDs de clipPath únicos em cada SVG: IDs duplicados podem fazer ambas as vistas usar o primeiro recorte e invalidar a comparação.

# Shelly Cloud

- A ligação Cloud permite comandos individuais explícitos no popup da divisão: abrir, parar, fechar e percentagem (esta exige calibração/posição conhecidas). Nunca adicionar movimentos aos fluxos de guardar/importar/consultar/iniciar/testar. Luzes e cenários continuam em demonstração; os cenários ignoram estores associados ao Cloud. Abrir todos/Fechar todos são comandos conjuntos reais para os estores associados, com confirmação individual e falhas parciais; os não associados continuam simulados. Os testes de comandos têm de usar mocks/fixture isolada, nunca dispositivos reais.
- Configuração validada por `ShellyCore.config`, em `casa-nl-shelly-cloud-v1`. Chave por omissão apenas na sessão (`casa-nl-shelly-session-v1`, associada ao servidor). Só persistir/exportar chave se o utilizador marcar explicitamente o check; não escrever credenciais em logs ou mensagens.
- A interface usa `shelly-transport.js` diretamente no navegador: API v2 HTTPS Shelly (`get`, `set/cover`, `set/groups`). Deve funcionar em alojamento estático/GitHub Pages sem Python. Manter fila serializada com intervalo mínimo de 1,1 segundos, timeout, credenciais omitidas nos cookies, redirecionamentos bloqueados, destinos restritos e mensagens sem segredos. Nunca repetir automaticamente comandos. Cancelar pedidos pendentes quando mudar a configuração. O gateway `scripts/serve.py` é opcional/legado; não voltar a torná-lo obrigatório nem bloquear a origem `file:`. Testes UI usam exclusivamente a fixture isolada que interceta chamadas Cloud antes de qualquer saída de rede.
- Não inventar percentagens quando posição ausente/offline ou não calibrada. Mostrar indisponível, conservar distinção de dados antigos e manter a luz natural por confirmar. Gen1 roller e Gen2+ cover têm formatos diferentes; alterações ao normalizador exigem testes de ambos.

- Depois de um comando aceite, consultar a posição real a cada 2 segundos, por até 90 segundos; nunca interpolar uma posição real nem repetir automaticamente um comando falhado. Conservar Parar acessível durante outro pedido. Abrir/fechar requerem estado online recente; a percentagem exige também calibração e posição conhecidas. Reiniciar o servidor Python após alterações aos endpoints.

- O comando conjunto usa a API Cloud de grupos e inclui o canal de cada ID. Validar até quatro pares ID/canal únicos; distinguir aceitação do pedido e posição efetiva; mostrar dispositivos offline/recusados sem fingir movimento. Não executar grupos automaticamente nos cenários, arranque, importação ou testes reais.
