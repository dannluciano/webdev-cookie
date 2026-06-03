# language: pt
Funcionalidade: Painel administrativo
  Como usuário autenticado
  Quero visualizar usuários e sessões em memória
  Para inspecionar o estado atual da aplicação

  Cenário: Listar usuários e sessões em memória
    Dado que existe um usuário cadastrado com e-mail "fred@example.com" e senha "12345678"
    E que o usuário "fred@example.com" está autenticado
    Quando o usuário acessa "GET /admin"
    Então a resposta deve ter status 200
    E a página deve exibir "Painel administrativo"
    E a página deve exibir a seção "Usuários"
    E a página deve listar o e-mail "fred@example.com"
    E a página deve listar o salt do usuário
    E a página deve listar o hash truncado da senha
    E a página deve exibir a seção "Sessões"
    E a página deve listar "Session ID"
    E a página deve listar a data de criação da sessão no formato "pt-BR"
    E a página deve listar a quantidade de views da sessão

  Cenário: Exibir valores padrão para sessão sem dados
    Dado que existe um usuário cadastrado com e-mail "fred@example.com" e senha "12345678"
    E que o usuário "fred@example.com" está autenticado
    E que existe uma sessão em memória sem e-mail e sem data de criação
    Quando o usuário acessa "GET /admin"
    Então a resposta deve ter status 200
    E a página deve listar o usuário da sessão como "Anônimo"
    E a página deve listar a data da sessão como "N/A"
    E a página deve listar a quantidade de views como 0

  Cenário: Preservar views existentes na listagem de sessões
    Dado que existe um usuário cadastrado com e-mail "gina@example.com" e senha "12345678"
    E que o usuário "gina@example.com" está autenticado
    E que a sessão do usuário possui 7 views
    Quando o usuário acessa "GET /admin"
    Então a resposta deve ter status 200
    E a página deve listar o e-mail "gina@example.com"
    E a página deve listar a quantidade de views como 7
