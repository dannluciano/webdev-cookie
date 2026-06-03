# language: pt
Funcionalidade: Autenticação
  Como usuário cadastrado
  Quero autenticar minhas credenciais
  Para iniciar uma sessão na aplicação

  Cenário: Fazer login com sucesso
    Dado que existe um usuário cadastrado com e-mail "bia@example.com" e senha "12345678"
    Quando o usuário envia "POST /login" com e-mail "bia@example.com" e senha "12345678"
    Então a resposta deve ter status 302
    E a resposta deve redirecionar para "/dashboard"
    E a resposta deve definir o cookie "sessionId"
    E o cookie "sessionId" deve usar "HttpOnly"
    E o cookie "sessionId" deve usar "Path=/"
    E o cookie "sessionId" deve usar "SameSite=Strict"
    E a sessão criada deve guardar o e-mail "bia@example.com"
    E a sessão criada deve guardar a data de criação

  Esquema do Cenário: Rejeitar credenciais inválidas
    Dado que existe um usuário cadastrado com e-mail "duda@example.com" e senha "12345678"
    Quando o usuário envia "POST /login" com e-mail "<email>" e senha "<senha>"
    Então a resposta deve ter status 401
    E a página deve exibir "Login inválido"
    E a página deve exibir "As credenciais informadas não conferem."
    E nenhuma nova sessão deve ser criada

    Exemplos:
      | email             | senha    |
      | ghost@example.com | 12345678 |
      | duda@example.com  | 87654321 |

  Cenário: Validar senha usando comparação segura
    Dado que existe um usuário cadastrado com e-mail "leo@example.com" e senha "12345678"
    Quando a aplicação verifica a senha "12345678" do usuário "leo@example.com"
    Então a comparação deve usar uma operação segura contra ataques de tempo
    E o resultado da validação deve ser verdadeiro
