# language: pt
Funcionalidade: Áreas protegidas
  Como aplicação
  Quero restringir dashboard, administração e logout a usuários autenticados
  Para proteger informações privadas e sessões

  Esquema do Cenário: Bloquear acesso anônimo a rota protegida
    Dado que não existe sessão autenticada
    Quando o visitante acessa "<método> <rota>"
    Então a resposta deve ter status 401
    E a página deve exibir "Acesso não autorizado"
    E a página deve exibir "Você precisa fazer login para acessar esta área."
    E a página deve oferecer o link "Fazer login" para "/login"
    E a página deve oferecer o link "Criar conta" para "/register"

    Exemplos:
      | método | rota       |
      | GET    | /dashboard |
      | GET    | /admin     |
      | GET    | /logout    |

  Cenário: Acessar dashboard autenticado
    Dado que existe um usuário cadastrado com e-mail "bia@example.com" e senha "12345678"
    E que o usuário "bia@example.com" está autenticado
    Quando o usuário acessa "GET /dashboard"
    Então a resposta deve ter status 200
    E a página deve exibir "Dashboard"
    E a página deve exibir "Bem-vindo"
    E a página deve exibir "bia@example.com"
    E a página deve oferecer o link "Encerrar sessão" para "/logout"

  Cenário: Encerrar sessão autenticada
    Dado que existe um usuário cadastrado com e-mail "cai@example.com" e senha "12345678"
    E que o usuário "cai@example.com" está autenticado
    Quando o usuário acessa "GET /logout"
    Então a resposta deve ter status 200
    E a página deve exibir "Logout realizado"
    E a página deve exibir "A sessão foi encerrada com sucesso."
    E a resposta deve definir o cookie "sessionId" com "Max-Age=0"
    E a sessão atual deve ser removida da memória

  Cenário: Bloquear dashboard após logout
    Dado que existe um usuário cadastrado com e-mail "cai@example.com" e senha "12345678"
    E que o usuário "cai@example.com" está autenticado
    Quando o usuário acessa "GET /logout"
    E tenta acessar "GET /dashboard" com o cookie antigo
    Então a resposta deve ter status 401
    E a página deve exibir "Acesso não autorizado"
