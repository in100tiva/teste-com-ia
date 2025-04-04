// Funções de autenticação e gerenciamento de sessão
const auth = {
    // Verificar estado atual da autenticação
    async getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    
    // Verificar se o usuário está autenticado
    async isAuthenticated() {
      const user = await this.getCurrentUser();
      return !!user;
    },
    
    // Login com email e senha
    async login(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return data;
    },
    
    // Registro de novo usuário
    async register(email, password, userData) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      if (error) throw error;
      return data;
    },
    
    // Logout
    async logout() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    },
    
    // Redirecionar para página de login se não autenticado
    async requireAuth() {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        window.location.href = '/index.html';
        return false;
      }
      return true;
    },
    
    // Salvar informações de perfil do usuário
    async getProfile(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    }
  };
  
  // Verificar autenticação ao carregar páginas protegidas
  document.addEventListener('DOMContentLoaded', async () => {
    // Logout ao clicar no botão de logout
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await auth.logout();
          window.location.href = '/index.html';
        } catch (error) {
          console.error('Erro ao fazer logout:', error);
        }
      });
    }
    
    // Na página inicial (login)
    const professorLoginBtn = document.getElementById('professor-login');
    const monitorLoginBtn = document.getElementById('monitor-login');
    const loginForm = document.getElementById('login-form');
    const backButton = document.getElementById('back-button');
    const submitLoginBtn = document.getElementById('submit-login');
    
    if (professorLoginBtn && monitorLoginBtn) {
      // Mostrar formulário de login ao clicar em "Professor"
      professorLoginBtn.addEventListener('click', () => {
        document.querySelector('.login-options').classList.add('hidden');
        loginForm.classList.remove('hidden');
        localStorage.setItem('userRole', 'professor');
      });
      
      // Mostrar formulário de login ao clicar em "Monitor"
      monitorLoginBtn.addEventListener('click', () => {
        document.querySelector('.login-options').classList.add('hidden');
        loginForm.classList.remove('hidden');
        localStorage.setItem('userRole', 'monitor');
      });
      
      // Voltar para as opções
      if (backButton) {
        backButton.addEventListener('click', () => {
          document.querySelector('.login-options').classList.remove('hidden');
          loginForm.classList.add('hidden');
          localStorage.removeItem('userRole');
        });
      }
      
      // Processar login
      if (submitLoginBtn) {
        submitLoginBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          
          if (!email || !password) {
            alert('Por favor, preencha todos os campos.');
            return;
          }
          
          try {
            await auth.login(email, password);
            const role = localStorage.getItem('userRole');
            
            if (role === 'professor') {
              window.location.href = '/professor/dashboard.html';
            } else if (role === 'monitor') {
              // Redirecionar para uma página de seleção de link do monitor
              // ou diretamente para a página do monitor se for o caso
              alert('Login de monitor realizado. Por favor, use o link fornecido pelo professor.');
            }
          } catch (error) {
            alert('Erro ao fazer login: ' + error.message);
          }
        });
      }
    }
  });