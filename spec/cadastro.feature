# language: pt
Funcionalidade: Cadastro de usuários
  Como visitante
  Quero criar uma conta com e-mail e senha
  Para acessar áreas protegidas da aplicação

  Cenário: Cadastrar usuário com sucesso
    Dado que não existe usuário cadastrado com e-mail "ana@example.com"
    Quando o visitante envia "POST /register" com e-mail "ana@example.com" e senha "12345678"
    Então a resposta deve ter status 200
    E a página deve exibir "Usuário criado"
    E a página deve exibir "A conta foi criada com sucesso. Agora você já pode fazer login."
    E a página deve oferecer o link "Fazer login" para "/login"
    E o usuário "ana@example.com" deve existir em memória
    E a senha do usuário não deve estar armazenada em texto puro
    E o usuário deve possuir "salt" aleatorio
    E o hash da senha deve ser gerado com "pbkdf2" e digest "sha512"

  Cenário: Bloquear cadastro com e-mail já existente
    Dado que existe um usuário cadastrado com e-mail "ana@example.com" e senha "12345678"
    Quando o visitante envia "POST /register" com e-mail "ana@example.com" e senha "12345678"
    Então a resposta deve ter status 409
    E a página deve exibir "Cadastro não concluido"
    E a página deve exibir "Já existe um usuário cadastrado com esse e-mail."
    E a página deve oferecer o link "Tentar novamente" para "/register"
    E a página deve oferecer o link "Ir para login" para "/login"
