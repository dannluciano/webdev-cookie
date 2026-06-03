# language: pt
Funcionalidade: Gerenciamento de sessões
  Como aplicação
  Quero manter sessões temporárias em memória
  Para autenticar usuários sem persistir estado entre reinícios

  Cenário: Criar sessão em memória após login válido
    Dado que existe um usuário cadastrado com e-mail "nina@example.com" e senha "12345678"
    Quando o usuário envia "POST /login" com e-mail "nina@example.com" e senha "12345678"
    Então uma nova sessão deve existir em memória
    E a sessão deve estar associada ao cookie "sessionId"
    E a sessão deve guardar "email"
    E a sessão deve guardar "createdAt"

  Cenário: Remover sessões expiradas
    Dado que existe uma sessão em memória criada há 31 minutos
    E que existe uma sessão em memória criada agora
    E que existe uma sessão em memória sem data de criação
    Quando a rotina de limpeza de sessões é executada
    Então a sessão criada há 31 minutos deve ser removida
    E a sessão sem data de criação deve ser removida
    E a sessão criada agora deve ser preservada

  Cenário: Remover sessão atual no logout
    Dado que existe um usuário cadastrado com e-mail "otto@example.com" e senha "12345678"
    E que o usuário "otto@example.com" está autenticado
    Quando o usuário acessa "GET /logout"
    Então a sessão associada ao cookie "sessionId" deve ser removida
    E a resposta deve expirar o cookie "sessionId"
