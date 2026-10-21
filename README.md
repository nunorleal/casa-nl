# Casa NL · Domótica

Protótipo local em português com planta realista baseada na segunda referência do utilizador. Abra `dist/index.html` no navegador ou sirva `dist/` num servidor HTTP local.

## Funcionalidades
- Planta com mobiliário realista, madeira, tecidos, sombras e portas, preparada com ImageGen a partir da imagem fornecida. Fonte e prompt em `dist/assets/PROMPT.md`.
- Controlos HTML interativos sobre a planta, separados da imagem.
- Vista Estores: quatro estores ilustrativos, posição 0–100%, abrir, fechar, parar e controlo conjunto. Movimento simulado com progresso e paragem.
- Vista Iluminação: oito zonas, controlo por divisão e conjunto, recortes independentes de um render noturno (ImageGen, `dist/assets/planta-noturna.png`) na sala, nos dois quartos, no corredor, nas duas casas de banho, na cozinha e na varanda. A imagem noturna mantém a geometria da planta e os recortes seguem as paredes, com transições suaves; mantêm-se ativas também na vista de estores.
- Cenário Boa noite: fecha estores e mantém a luz do corredor.
- Estados de demonstração guardados em localStorage, com reposição nas configurações.
- Layout adaptável a telemóvel e computador. Labels de divisões podem ser ocultados.

## Shelly Cloud — versão 1.24

Em **Definições → Shelly Cloud e estores**:

1. Copiar o **Server URI** e a **Authorization cloud key** das definições do utilizador na app Shelly. A palavra-passe da conta não é usada.
2. Introduzir o **Device ID** e canal de cada estore. O canal começa em 0. Um ID/canal não pode repetir-se em duas divisões.
3. Guardar e escolher **Consultar dados**. O dispositivo tem de pertencer à conta e usar modo cover/roller.

A consulta usa a API Cloud v2.0-beta, compatível com estados de estores Gen1 (`rollers`) e Gen2+ (`cover:n`). Mostra ligação, modelo/geração, posição (0% fechado, 100% aberto), movimento, calibração e, se fornecidos pelo modelo, potência, energia acumulada, tensão, corrente, temperatura interna e erros. Dados ausentes são identificados. A atualização é manual e mostra a hora de consulta; a app não finge acompanhamento em tempo real.

O popup da divisão controla o estore real: **Abrir**, **Parar**, **Fechar** e percentagem. Envia um comando individual Cloud e consulta depois as posições reportadas, a cada 2 segundos por até 90 segundos, sem simular progresso nem repetir comandos falhados. Abrir/fechar requerem dados online recentes; o controlo por percentagem exige calibração e posição conhecidas. Parar permanece acessível durante o envio de outro comando. Estados e erros aparecem no próprio popup.

A app consulta automaticamente os estados ao iniciar com credenciais disponíveis e ao abrir uma divisão com dados antigos. Guardar/importar configurações e consultar estados **nunca move equipamentos**. Luzes e cenários continuam em demonstração; os cenários ignoram os estores reais. Em Controlos gerais → Estores, Abrir todos/Fechar todos enviam um comando Cloud de grupo aos estores associados online, preservando os canais. Os estores não associados continuam simulados. Posições desconhecidas/offline são identificadas. Repor demonstração preserva as associações.

### GitHub Pages e ligação direta

A interface em `dist/` é estática e comunica diretamente do navegador para a API Shelly Cloud v2 por HTTPS, seguindo o modelo da MeteoNL. Não depende de Python nem de endpoints locais para consultar ou comandar os estores. É possível alojar o conteúdo de `dist/` no GitHub Pages; todos os recursos usam caminhos relativos. Esta entrega não publica o projeto.

Para publicar manualmente, carregar **o conteúdo de `dist/`** na raiz de um repositório e selecionar esse branch em Settings → Pages → Deploy from a branch (pasta `/`). Não carregar cópias JSON com credenciais. Configurações são específicas do navegador e da origem: ao passar de `file:`/localhost para o endereço GitHub Pages, importar o JSON ou voltar a configurar a conta; chaves apenas de sessão têm de ser introduzidas novamente.

Para usar localmente no Mac, continua disponível **Abrir Casa NL.command**, ou `python3 scripts/serve.py --open`. Esse servidor é opcional: serve os ficheiros, mas a interface já não utiliza o gateway Python. Abrir `dist/index.html` também usa a ligação direta; a disponibilidade das chamadas depende das permissões de rede/CORS do navegador e do serviço. Erros de rede ficam visíveis e comandos nunca são repetidos automaticamente.

Os pedidos são serializados com intervalo mínimo de 1,1 segundos, destinos HTTPS Shelly validados e redirecionamentos bloqueados. IDs e chave são enviados apenas ao servidor Shelly configurado; a planta não é enviada. A chave fica por omissão em sessionStorage. O check explícito de guardar a chave passa a incluí-la em localStorage e **também no JSON**, em texto simples: guardar essas cópias em local privado. Sem o check, o JSON contém servidor e associações, mas não a chave da sessão. Não partilhar credenciais no chat.

Configuração em `casa-nl-shelly-cloud-v1`; chave de sessão em `casa-nl-shelly-session-v1`. O importador valida a configuração Cloud antes de a aplicar. A importação nunca move equipamentos. Depois de recarregar, os estados podem ser consultados se as credenciais estiverem disponíveis.

Validação: 41 testes JavaScript e 10 testes Python, incluindo comandos, intervalos, calibração, estado fresco, consulta sem movimentos e endpoints restritos. Teste no navegador de abrir (100%), fechar (0%), parar e percentagem (50%) com `tests/cloud_ui_fixture.py`, servidor isolado na porta 8081 que bloqueia todo o acesso Cloud e simula respostas. Nenhum dispositivo real foi movido pelos testes. A confirmação física fica a cargo do utilizador.


Fontes oficiais: https://shelly-api-docs.shelly.cloud/cloud-control-api/ , https://shelly-api-docs.shelly.cloud/cloud-control-api/communication-v2/ , https://shelly-api-docs.shelly.cloud/gen1/ , https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Cover/ .

## Privacidade
Projeto local. Não foi enviado nem publicado no Sites; mantém-se o bloqueio de publicação da primeira versão até autorização explícita.

A versão inicial foi preservada em `versions/v1/`.

## Interface iPad vertical

A planta mantém-se sempre no ecrã, dimensionada à área útil, sem scroll. Tocar na área ou no nome de uma divisão abre um popup com iluminação e estore quando disponível. A barra inferior abre Controlos gerais, Cenários e Definições. Fechar pelo botão, pela tecla Escape ou por toque fora do popup. Áreas seguras do iPad respeitadas. Versão anterior preservada em `versions/v2/`.

## Meteorologia e luz natural

- Meteorologia real via https://api.open-meteo.com/v1/forecast e pesquisa de cidades via https://geocoding-api.open-meteo.com/v1/search. Não exige chave, nem pede geolocalização. As coordenadas da cidade escolhida são enviadas para Open-Meteo. A app não envia a planta.
- A cidade inicial é Figueira da Foz, resolvida pela API; a cidade selecionada e o modo de ambiente são guardados no navegador.
- Mostra temperatura, símbolo e descrição do estado do tempo. Atualiza aproximadamente de 15 em 15 minutos e quando regressa à app. Sem rede, mostra os últimos dados com aviso ou temperatura indisponível; nunca inventa temperaturas.
- Ambiente automático usa nascer/pôr do sol da cidade em timestamps UTC. Sem resposta da API, estima a posição do sol a partir das coordenadas da cidade; sem cidade, aguarda seleção.
- Com a luz elétrica ligada, a divisão fica clara em qualquer horário. Com luz apagada, de dia a abertura do estore determina a luz natural, enquanto à noite o render é escuro independentemente da abertura. WC e corredor não têm entrada direta de luz natural; a varanda recebe luz exterior.
- Modos Diurno e Noturno nas definições permitem pré-visualização. A meteorologia continua real; apenas o ambiente visual é forçado.
- Fundo de paralelos antracite em `dist/assets/paralelos-antracite.png`, gerado com ImageGen. Prompt em `dist/assets/PROMPT-PARALELOS.md`. O fundo branco original da planta é recortado em CSS, preservando os alinhamentos dos renders.
- Verificações: `node --test tests/environment.test.cjs`, incluindo luz elétrica, abertura de estores, nascer/pôr do sol, coordenadas solares e ícones WMO. Integração de pesquisa, seleção, dados reais e modos verificada em navegador a 820 × 1180.

Documentação: https://open-meteo.com/en/docs e https://open-meteo.com/en/docs/geocoding-api.

## Disposição da sala

Sofá e tapete da sala rodados 90° no sentido anti-horário, com sofá horizontal virado para a parede superior. Consola da televisão reposicionada nessa parede, em frente ao sofá. Renders atualizados em `dist/assets/planta-realista-sofa-v2.png` e `dist/assets/planta-noturna-sofa-v2.png`, preparados com ImageGen; prompts em `dist/assets/PROMPT-SOFA.md`.

O pavimento exterior acompanha o período do ambiente: mais claro de dia e escuro à noite. Em Automático, as mudanças usam o nascer/pôr do sol da cidade na API; Diurno/Noturno também permitem antever o exterior. A alteração da claridade não muda o tamanho dos paralelos.

## Continuidade do pavimento

A textura exterior passou para `dist/assets/paralelos-seamless-v2.svg`, usando uma nova imagem de ImageGen (`paralelos-seamless-v2.png`) e quatro reflexões no padrão SVG para as bordas coincidirem em ambas as direções. Fundo a 400 × 400 px por padrão, com quatro quadrantes de 200 × 200 px. Preserva as alterações de claridade de dia/noite. Prompt e método em `dist/assets/PROMPT-SEAMLESS.md`; verificação visual da repetição na aplicação concluída.

Na versão 1.01, os recortes noturnos incluem extensões próprias para ombreiras, soleiras e folhas de portas. A geometria adicional afeta apenas a iluminação; as áreas de toque de cada divisão mantêm-se.

Na versão 1.03, a correção das portas foi afinada conforme a imagem do utilizador: apenas os pedaços de chão nos vãos acompanham a iluminação. As paredes delimitadoras ficam brancas. Foram retiradas as extensões que escureciam paredes e separados os pisos junto às duas portas esquerdas. Verificadas as coordenadas dos dois vãos e a exclusão das paredes dos WC, do roupeiro e da divisória quarto/sala.

Na versão 1.04, “Mostrar banners das divisões” usa um check quadrado com maior contraste. Desativar esconde o banner completo (incluindo fundo e indicador), mantendo todas as áreas de toque na planta, também nos vãos. Tocar na divisão ou no banner abre o mesmo popup de equipamentos. A preferência é guardada no navegador e foi verificada após recarregar a página.

Na versão 1.06, as paredes têm uma camada permanente recortada do render diurno, colocada por cima de todos os recortes noturnos. Abrange paredes exteriores e divisórias dos quartos e WC, preservando as aberturas e os troços de chão nas portas. Verificada visualmente em 820 × 1180 com todas as luzes apagadas; os estados anteriores das luzes foram repostos após a verificação.

Na versão 1.07 existem três renders alinhados: dia (`planta-realista-sofa-v2.png`), noite sem luz (`planta-noturna-sofa-v2.png`) e noite com iluminação elétrica (`planta-noturna-iluminada.png`). A terceira imagem foi criada com ImageGen, com focos quentes e janelas escuras; prompt em `dist/assets/PROMPT-ILUMINACAO-NOTURNA.md`. Cada divisão alterna independentemente. Durante o dia, a luz elétrica mistura-se com o render diurno conforme a abertura dos estores; de noite, com luz ligada, aparece o render elétrico. As paredes mantêm a camada branca diurna por cima dos três estados. Nove testes de ambiente passaram e a alternância da sala foi verificada no navegador.

Na versão 1.08, a camada elétrica fica sempre visível com a luz ligada: mesmo de dia com estores abertos, mantém pelo menos 45% de intensidade, misturada com a luz natural. Aumenta até 100% sem luz natural; ao desligar, a camada elétrica desaparece. Inclui teste de regressão para todas as divisões em pleno dia.

Na versão 1.09, um duplo clique no banner abre a edição do nome (até 40 caracteres). O nome atualizado é usado no banner, lista de dispositivos e popup. Clique simples continua a abrir os equipamentos; F2 também permite editar o banner focado. Manter o botão do rato pressionado e arrastar move o banner, com o retângulo completo limitado ao interior da divisão, incluindo contornos em L e limites diagonais. Nomes e posições são guardados separadamente dos estados dos equipamentos e mantidos ao repor a demonstração. Verificados no navegador: duplo clique, edição com caracteres especiais, persistência após recarregar, arrastamento para fora com contenção no limite e ausência de popup ao largar. Testes de geometria em `tests/banner.test.cjs`.

### Cópia de segurança — versão 1.10

Em Definições, **Exportar JSON** descarrega uma cópia das divisões (luzes e estores), nomes e posições dos banners, visibilidade dos banners, cidade e modo ambiental. **Importar JSON** valida o ficheiro (até 2 MB), apresenta um resumo e permite restaurar ou cancelar. Restaurar substitui a configuração deste navegador e recarrega a aplicação; não envia comandos a equipamentos.

O formato tem `application: "Casa NL"`, `schemaVersion: 1`, versão/data da exportação e `data`, com as configurações locais `casa-nl-*`. O cache meteorológico é excluído e volta a ser atualizado. Os registos Shelly que a aplicação guardar com este prefixo também são preservados; a ligação Shelly continua por configurar. Não inclui os ficheiros de imagem nem código da app. Se futuramente forem guardadas credenciais Shelly, também estarão presentes no JSON, pelo que a cópia deve ser guardada num local privado.

Validação: 19 testes automatizados (incluindo roundtrip com Shelly, ficheiros inválidos, campos inesperados e rollback em falha de armazenamento) e exportação/importação/restauração verificadas no navegador.

### Luz natural proporcional — versão 1.11

Durante o dia, a abertura de cada estore corresponde diretamente à percentagem de luz natural da respetiva divisão: 0% fechado, 50% de luz a meia abertura e 100% de luz totalmente aberto. À noite não há luz natural, independentemente da abertura. A iluminação elétrica mantém a sua camada própria. Validação: 20 testes, incluindo todas as aberturas de 0 a 100% em passos de 0,5 nas quatro divisões com estores.

### Luz diurna indireta — versão 1.12

O corredor e o WC central recebem luz natural proporcional à abertura do estore do Quarto 2. O WC de cima segue o estore do Quarto principal. A associação usa os IDs das divisões e acompanha o movimento dos estores, mesmo após mudar os nomes. As legendas indicam a percentagem de luz e o estore de origem. À noite não há luz natural; as luzes elétricas de cada divisão continuam independentes. Validação: 22 testes, incluindo as três associações em passos de 0,5%, estados elétricos e alterações de nome.

### Recortes junto à parede dos quartos — versão 1.13

Corrigidas duas faixas de pavimento que ficavam claras em modo noturno, acima e abaixo da parede entre os quartos. O recorte do quarto principal chega a y=470 e o do Quarto 2 começa em y=497. A máscara branca da parede mantém-se intacta. Verificação visual da composição e amostragem de píxeis nas faixas corrigidas e na parede.

### Junções dos recortes — versão 1.14

Eliminadas linhas finas do render diurno nas junções de portas e na fronteira sala/cozinha. Os recortes ortogonais alinham-se à grelha de píxeis; cada divisão agrega chão e vãos num único path. A máscara branca das paredes mantém-se independente e a diagonal da varanda continua suavizada. Comparação visual antes/depois no navegador a escala reduzida.

### Dois vãos restantes — versão 1.15

Recortes de chão prolongados 2 píxeis nos vãos do WC superior e corredor/sala para cobrir as duas fugas claras restantes. Corrigido o canto de pavimento em x=190..193 que estava incluído na máscara branca da parede corredor/sala. As superfícies brancas das paredes são preservadas. Comparação antes/depois verificada no navegador.

### Vão corredor/Quarto 2 — versão 1.16

Corrigida a linha vertical clara na passagem para o Quarto 2, com sobreposição de 2 píxeis nos limites do recorte do vão. A máscara branca das ombreiras mantém-se intacta. Comparação visual ampliada antes/depois no navegador.

### Banners sem pontos — versão 1.17

Retirados os pontos antes dos nomes em todos os banners. O banner do corredor usa menos espaço lateral e texto adaptado à largura disponível, para mostrar «Corredor» completo. Verificado no navegador, incluindo medição do texto sem truncagem.

### Banners dos estores — versão 1.18

Repostos quatro banners junto às janelas com ícone de estore, nome da divisão e percentagem de abertura em tempo real. Tocar num banner abre os controlos da respetiva divisão. Em Definições, o check «Mostrar banners dos estores» permite ocultá-los independentemente dos nomes das divisões. A preferência persiste em `casa-nl-show-blind-banners` e integra a exportação/importação JSON; ficheiros anteriores continuam compatíveis (banners visíveis por omissão). Verificados no iPad vertical (820 × 1180), alteração de 100% para 50%, abertura do popup e ocultação após recarregar. Os 23 testes passaram, incluindo a nova preferência de backup.

### Linha entre sala e cozinha — versão 1.19

Corrigida a fuga fina do render diurno junto às costas do sofá. O recorte da cozinha começa em y=1078 e sobrepõe 2 píxeis de chão da sala, mantendo a fronteira visual em y=1080. As máscaras das paredes permanecem intactas. Comparação no navegador a escala fracionária de 713/480, com IDs SVG independentes, confirmou a eliminação da linha.

### Checks dos banners — versão 1.21

Os checks de mostrar banners das divisões e dos estores partilham os mesmos estilos de caixa, preenchimento e símbolo. As duas linhas usam colunas fixas para ícone e check, mantendo os checks alinhados à direita mesmo com texto de comprimentos diferentes.

### Controlo dos estores Cloud — versão 1.22

Ativados os comandos individuais no popup. A posição vem da consulta ao Shelly, os erros ficam visíveis no popup e o slider envia a percentagem ao terminar o ajuste. É necessário reiniciar o servidor Python para carregar o endpoint novo; recarregar apenas a página não atualiza o processo Python.

### Abrir todos / Fechar todos reais — versão 1.23

Os botões dos controlos gerais comandam os estores Cloud associados com uma única chamada à API `/v2/devices/api/set/groups`, incluindo `<ID>_<canal>` para cada dispositivo. Verifica estados antigos antes do envio, desativa repetição durante o pedido, identifica os não disponíveis e apresenta o resultado por divisão, incluindo falhas parciais. Não simula posições reais; a leitura posterior atualiza a planta e a lista. Os estores sem associação continuam em demonstração. Os cenários continuam sem acionar estores reais.

Validação de UI exclusivamente na fixture da porta 8081: quatro dispositivos a 0%, quatro a 100% e recusa simulada da cozinha, que conserva 50% enquanto os outros três chegam a 0%. Gateway e normalizador cobertos por 43 testes. Serviço Python deve ser reiniciado depois da atualização do endpoint de grupo.

### Ligação Cloud direta — versão 1.24

Consultas, comandos individuais e grupos usam diretamente os endpoints HTTPS da API v2. A fila respeita o intervalo entre pedidos e cancela pedidos pendentes se a configuração mudar. Respostas vazias de sucesso e falhas parciais são tratadas; mensagens não reproduzem conteúdo remoto nem credenciais. Removidas as restrições a `file:` e os avisos de obrigatoriedade do servidor local. Inclui testes de transporte sem rede e fixture isolada que interceta todas as chamadas Shelly antes de chegarem à rede. O servidor Python anterior permanece opcional para desenvolvimento.
