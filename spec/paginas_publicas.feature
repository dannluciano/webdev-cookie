# language: pt
Funcionalidade: Páginas públicas
  Como visitante da aplicação
  Quero acessar as páginas públicas
  Para conhecer a aplicação, criar conta e fazer login

  Cenário: Exibir página inicial para visitante anônimo
    Dado que não existe sessão autenticada
    Quando o visitante acessa "GET /"
    Então a resposta deve ter status 200
    E a página deve exibir "Webdev Cookie"
    E a página deve exibir "Crie uma conta ou faça login para acessar as áreas protegidas."
    E a página deve oferecer o link "Criar conta" para "/register"
    E a página deve oferecer o link "Fazer login" para "/login"
    E a navegação não deve exibir "Logout"

  Cenário: Exibir formulário de cadastro
    Quando o visitante acessa "GET /register"
    Então a resposta deve ter status 200
    E a página deve exibir "Criar usuário"
    E a página deve conter um formulário com método "post" e ação "/register"
    E o formulário deve solicitar "email" obrigatório
    E o formulário deve solicitar "password" obrigatório com tamanho mínimo de 8 caracteres

  Cenário: Exibir formulário de login
    Quando o visitante acessa "GET /login"
    Então a resposta deve ter status 200
    E a página deve exibir "Entrar"
    E a página deve conter um formulário com método "post" e ação "/login"
    E o formulário deve solicitar "email" obrigatório
    E o formulário deve solicitar "password" obrigatório

  Cenário: Exibir página inicial para usuário autenticado
    Dado que existe um usuário cadastrado com e-mail "maria@example.com" e senha "12345678"
    E que o usuário "maria@example.com" está autenticado
    Quando o usuário acessa "GET /"
    Então a resposta deve ter status 200
    E a página deve exibir "Você está autenticado como"
    E a página deve exibir "maria@example.com"
    E a navegação deve exibir "Dashboard"
    E a navegação deve exibir "Admin"
    E a navegação deve exibir "Logout"
    E a navegação não deve exibir o link "Login"
