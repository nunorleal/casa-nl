# Relógio MeteoNL ampliado — 1.98

Nas definições do MeteoNL, em Relógio e unidades, escolher «Ampliar relógio após inatividade». Por omissão são30 segundos; também permite15 segundos,1,2 ou5 minutos e Desativado. A preferência é guardada automaticamente e integra a cópia JSON da Casa NL. Backups anteriores continuam válidos.

Após esse intervalo sem interação, a data, hora, cidade e meteorologia atual ocupam quase todo o ecrã. Mantém a leitura Real do sensor e as horas solares. Um toque em qualquer zona regressa à vista normal; esse toque não aciona os controlos por baixo. Escape, Enter e Espaço também permitem regressar. A contagem recomeça após regressar.

A contagem fica suspensa enquanto as definições estão abertas, a página está oculta ou se está na Casa em vez do MeteoNL. O modo de cabeceira continua independente, assim como a opção já existente de abrir o MeteoNL por inatividade na Casa. A ampliação é apenas visual, sem pedidos Shelly adicionais.

Verificado em820×1180: ampliação automática, regresso com um toque, preferência30 segundos preservada ao reabrir definições e nenhum comando na fixture isolada. Testes cobrem prazos, interação, suspensão, desativação, validação e roundtrip da preferência no backup.

## Cores noturnas — 2.00

Definições → Modo de cabeceira → Cores do modo noturno permite escolher Vermelho ou Colorido esbatido. A escolha só entra em vigor quando o modo de cabeceira está ativo, respeitando o horário automático. Vermelho aplica-se a toda a interface, incluindo definições e relógio ampliado; Escurecimento também reduz a intensidade do vermelho. Colorido esbatido conserva o comportamento anterior e é a opção por omissão. A preferência é guardada e incluída no backup JSON.
