// Funcionalidades específicas para as páginas do professor
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    try {
      const isAuth = await auth.requireAuth();
      if (!isAuth) return;
    } catch (error) {
      console.error('Erro de autenticação:', error);
      window.location.href = '/index.html';
      return;
    }
    
    // Dashboard do professor
    const classesList = document.getElementById('classes-list');
    const addClassBtn = document.getElementById('add-class');
    const addClassModal = document.getElementById('add-class-modal');
    const cancelClassBtn = document.getElementById('cancel-class');
    const classForm = document.getElementById('class-form');
    
    // Função para carregar as turmas
    async function loadClasses() {
      if (!classesList) return;
      
      try {
        classesList.innerHTML = '<p class="loading">Carregando turmas...</p>';
        
        const user = await auth.getCurrentUser();
        const classes = await db.getClasses(user.id);
        
        if (classes.length === 0) {
          classesList.innerHTML = '<p class="empty-state">Nenhuma turma encontrada. Crie uma nova turma para começar.</p>';
          return;
        }
        
        let html = '';
        classes.forEach(cls => {
          html += `
            <div class="class-card" data-id="${cls.id}">
              <h3>${cls.name}</h3>
              <div class="class-meta">
                <span>${cls.schedule}</span>
                <span>${formatDateRange(cls.start_date, cls.end_date)}</span>
              </div>
              <div class="class-actions">
                <button class="btn btn-outline attendance-btn">Registrar Presenças</button>
              </div>
            </div>
          `;
        });
        
        classesList.innerHTML = html;
        
        // Adicionar event listeners aos botões
        document.querySelectorAll('.attendance-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const classId = e.target.closest('.class-card').dataset.id;
            window.location.href = `/professor/attendance.html?id=${classId}`;
          });
        });
        
      } catch (error) {
        console.error('Erro ao carregar turmas:', error);
        classesList.innerHTML = '<p class="error">Erro ao carregar turmas. Tente novamente mais tarde.</p>';
      }
    }
    
    // Mostrar modal de nova turma
    if (addClassBtn) {
      addClassBtn.addEventListener('click', () => {
        addClassModal.classList.remove('hidden');
      });
    }
    
    // Cancelar criação de turma
    if (cancelClassBtn) {
      cancelClassBtn.addEventListener('click', () => {
        addClassModal.classList.add('hidden');
        classForm.reset();
      });
    }
    
    // Salvar nova turma
    if (classForm) {
      classForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const className = document.getElementById('class-name').value;
        const classSchedule = document.getElementById('class-schedule').value;
        const classStart = document.getElementById('class-start').value;
        const classEnd = document.getElementById('class-end').value;
        
        if (!className || !classStart || !classEnd) {
          alert('Por favor, preencha todos os campos obrigatórios.');
          return;
        }
        
        try {
          const user = await auth.getCurrentUser();
          
          const classData = {
            name: className,
            schedule: classSchedule,
            start_date: classStart,
            end_date: classEnd,
            professor_id: user.id
          };
          
          await db.createClass(classData);
          addClassModal.classList.add('hidden');
          classForm.reset();
          loadClasses();
          
        } catch (error) {
          console.error('Erro ao criar turma:', error);
          alert('Erro ao criar turma: ' + error.message);
        }
      });
    }
    
    // Página de registro de presenças
    const attendanceDate = document.getElementById('attendance-date');
    const studentsList = document.getElementById('students-list');
    const markAllBtn = document.getElementById('mark-all');
    const saveAttendanceBtn = document.getElementById('save-attendance');
    const addStudentBtn = document.getElementById('add-student');
    const addStudentModal = document.getElementById('add-student-modal');
    const cancelStudentBtn = document.getElementById('cancel-student');
    const studentForm = document.getElementById('student-form');
    const generateLinkBtn = document.getElementById('generate-link');
    const shareModal = document.getElementById('share-modal');
    const shareLink = document.getElementById('share-link');
    const copyLinkBtn = document.getElementById('copy-link');
    const closeShareBtn = document.getElementById('close-share');
    const prevDateBtn = document.getElementById('prev-date');
    const nextDateBtn = document.getElementById('next-date');
    const classTitle = document.getElementById('class-title');
    
    // Função para obter ID da turma da URL
    function getClassIdFromUrl() {
      const params = new URLSearchParams(window.location.search);
      return params.get('id');
    }
    
    // Função para formatar intervalo de datas
    function formatDateRange(start, end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
      return `${startDate.toLocaleDateString('pt-BR', options)} a ${endDate.toLocaleDateString('pt-BR', options)}`;
    }
    
    // Função para formatar data
    function formatDate(dateStr) {
      const date = new Date(dateStr);
      const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
      return date.toLocaleDateString('pt-BR', options);
    }
    
    // Carregar dados da turma
    async function loadClassInfo() {
      const classId = getClassIdFromUrl();
      if (!classId) return;
      
      try {
        const classInfo = await db.getClass(classId);
        if (classTitle) {
          classTitle.textContent = classInfo.name;
        }
      } catch (error) {
        console.error('Erro ao carregar informações da turma:', error);
      }
    }
    
    // Carregar lista de alunos e presenças para a data selecionada
    async function loadAttendance() {
      const classId = getClassIdFromUrl();
      if (!classId || !attendanceDate || !studentsList) return;
      
      try {
        studentsList.innerHTML = '<p class="loading">Carregando alunos...</p>';
        
        const date = attendanceDate.value;
        const students = await db.getStudents(classId);
        const attendance = await db.getAttendance(classId, date);
        
        // Mapear presenças por ID do aluno
        const presentStudents = {};
        attendance.forEach(record => {
          presentStudents[record.student_id] = record.present;
        });
        
        if (students.length === 0) {
          studentsList.innerHTML = '<p class="empty-state">Nenhum aluno encontrado. Adicione alunos à turma para registrar presenças.</p>';
          return;
        }
        
        let html = '';
        students.forEach(student => {
          const isPresent = student.id in presentStudents ? presentStudents[student.id] : false;
          
          html += `
            <div class="student-item" data-id="${student.id}">
              <div class="student-name">${student.name}</div>
              <div class="attendance-status">
                <label class="attendance-checkbox">
                  <input type="checkbox" class="attendance-input" ${isPresent ? 'checked' : ''}>
                  <span class="attendance-slider"></span>
                </label>
              </div>
            </div>
          `;
        });
        
        studentsList.innerHTML = html;
        
      } catch (error) {
        console.error('Erro ao carregar lista de presenças:', error);
        studentsList.innerHTML = '<p class="error">Erro ao carregar alunos. Tente novamente mais tarde.</p>';
      }
    }
    
    // Configurar o campo de data para hoje por padrão
    if (attendanceDate) {
      attendanceDate.valueAsDate = new Date();
      attendanceDate.addEventListener('change', loadAttendance);
    }
    
    // Navegar entre datas
    if (prevDateBtn) {
      prevDateBtn.addEventListener('click', () => {
        const currentDate = new Date(attendanceDate.value);
        currentDate.setDate(currentDate.getDate() - 1);
        attendanceDate.valueAsDate = currentDate;
        loadAttendance();
      });
    }
    
    if (nextDateBtn) {
      nextDateBtn.addEventListener('click', () => {
        const currentDate = new Date(attendanceDate.value);
        currentDate.setDate(currentDate.getDate() + 1);
        attendanceDate.valueAsDate = currentDate;
        loadAttendance();
      });
    }
    
    // Marcar todos os alunos como presentes
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.attendance-input');
        const isAllChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
          cb.checked = !isAllChecked;
        });
      });
    }
    
    // Salvar presenças
    if (saveAttendanceBtn) {
      saveAttendanceBtn.addEventListener('click', async () => {
        const classId = getClassIdFromUrl();
        if (!classId) return;
        
        try {
          const date = attendanceDate.value;
          const attendanceData = [];
          
          document.querySelectorAll('.student-item').forEach(item => {
            const studentId = item.dataset.id;
            const isPresent = item.querySelector('.attendance-input').checked;
            
            attendanceData.push({
              class_id: classId,
              student_id: studentId,
              date: date,
              present: isPresent
            });
          });
          
          await db.saveAttendanceBatch(attendanceData);
          alert('Presenças salvas com sucesso!');
          
        } catch (error) {
          console.error('Erro ao salvar presenças:', error);
          alert('Erro ao salvar presenças: ' + error.message);
        }
      });
    }
    
    // Mostrar modal para adicionar aluno
    if (addStudentBtn) {
      addStudentBtn.addEventListener('click', () => {
        addStudentModal.classList.remove('hidden');
      });
    }
    
    // Cancelar adição de aluno
    if (cancelStudentBtn) {
      cancelStudentBtn.addEventListener('click', () => {
        addStudentModal.classList.add('hidden');
        studentForm.reset();
      });
    }
    
    // Salvar novo aluno
    if (studentForm) {
      studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const classId = getClassIdFromUrl();
        if (!classId) return;
        
        const studentName = document.getElementById('student-name').value;
        const studentEmail = document.getElementById('student-email').value;
        
        if (!studentName) {
          alert('Por favor, digite o nome do aluno.');
          return;
        }
        
        try {
          const studentData = {
            name: studentName,
            email: studentEmail || null,
            class_id: classId
          };
          
          await db.createStudent(studentData);
          addStudentModal.classList.add('hidden');
          studentForm.reset();
          loadAttendance();
          
        } catch (error) {
          console.error('Erro ao adicionar aluno:', error);
          alert('Erro ao adicionar aluno: ' + error.message);
        }
      });
    }
    
    // Gerar link para monitor
    if (generateLinkBtn) {
      generateLinkBtn.addEventListener('click', async () => {
        const classId = getClassIdFromUrl();
        if (!classId) return;
        
        try {
          const date = attendanceDate.value;
          const linkCode = await db.generateMonitorLink(classId, date);
          
          shareLink.value = `${window.location.origin}/monitor/attendance.html?code=${linkCode}`;
          shareModal.classList.remove('hidden');
          
        } catch (error) {
          console.error('Erro ao gerar link:', error);
          alert('Erro ao gerar link: ' + error.message);
        }
      });
    }
    
    // Copiar link
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => {
        shareLink.select();
        document.execCommand('copy');
        alert('Link copiado para a área de transferência!');
      });
    }
    
    // Fechar modal de compartilhamento
    if (closeShareBtn) {
      closeShareBtn.addEventListener('click', () => {
        shareModal.classList.add('hidden');
      });
    }
    
    // Inicializar página
    if (classesList) {
      loadClasses();
    }
    
    if (studentsList) {
      loadClassInfo();
      loadAttendance();
    }
  });