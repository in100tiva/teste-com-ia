// Configuração e conexão com o Supabase
const SUPABASE_URL = 'SUA_URL_SUPABASE';
const SUPABASE_KEY = 'SUA_CHAVE_ANON_PUBLICA';

// Inicialização do cliente Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Funções de utilidade para acesso ao banco de dados
const db = {
  // Classes
  async getClasses(userId) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('professor_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async getClass(classId) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async createClass(classData) {
    const { data, error } = await supabase
      .from('classes')
      .insert([classData])
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  async updateClass(classId, classData) {
    const { data, error } = await supabase
      .from('classes')
      .update(classData)
      .eq('id', classId)
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  async deleteClass(classId) {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);
    
    if (error) throw error;
    return true;
  },
  
  // Students
  async getStudents(classId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('name');
    
    if (error) throw error;
    return data;
  },
  
  async getStudent(studentId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async getStudentByCode(accessCode) {
    const { data, error } = await supabase
      .from('students')
      .select('*, classes(*)')
      .eq('access_code', accessCode)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async createStudent(studentData) {
    // Gerar código de acesso aleatório para o aluno
    studentData.access_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('students')
      .insert([studentData])
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  // Attendance
  async getAttendance(classId, date) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, students(*)')
      .eq('class_id', classId)
      .eq('date', date);
    
    if (error) throw error;
    return data;
  },
  
  async getStudentAttendance(studentId) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async saveAttendance(attendanceData) {
    // Verificar se já existe registro para evitar duplicatas
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('class_id', attendanceData.class_id)
      .eq('student_id', attendanceData.student_id)
      .eq('date', attendanceData.date);
    
    if (existing && existing.length > 0) {
      // Atualizar registro existente
      const { data, error } = await supabase
        .from('attendance')
        .update({ present: attendanceData.present })
        .eq('id', existing[0].id)
        .select();
      
      if (error) throw error;
      return data[0];
    } else {
      // Criar novo registro
      const { data, error } = await supabase
        .from('attendance')
        .insert([attendanceData])
        .select();
      
      if (error) throw error;
      return data[0];
    }
  },
  
  async saveAttendanceBatch(attendanceArray) {
    // Para cada entrada, verificar se já existe e depois salvar
    const results = [];
    
    for (const attendance of attendanceArray) {
      try {
        const result = await this.saveAttendance(attendance);
        results.push(result);
      } catch (error) {
        console.error('Erro ao salvar presença:', error);
      }
    }
    
    return results;
  },
  
  // Class dates
  async getClassDates(classId) {
    const { data: classInfo } = await supabase
      .from('classes')
      .select('start_date, end_date, schedule')
      .eq('id', classId)
      .single();
    
    if (!classInfo) return [];
    
    // Gerar todas as datas de aula com base no cronograma e período
    const startDate = new Date(classInfo.start_date);
    const endDate = new Date(classInfo.end_date);
    const dates = [];
    
    // Função simplificada - em produção, melhorar para interpretar o campo schedule
    // e gerar apenas os dias da semana corretos
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Adicionar à lista se for dia de semana (seg-sex)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        dates.push(new Date(currentDate));
      }
      
      // Avançar para o próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  },
  
  // Monitor links
  async generateMonitorLink(classId, date) {
    // Formato: class_id-date-token
    const token = Math.random().toString(36).substring(2, 15);
    const formattedDate = date.replace(/-/g, '');
    const linkCode = `${classId}-${formattedDate}-${token}`;
    
    // Salvar no banco para validação posterior
    const { error } = await supabase
      .from('monitor_links')
      .insert([{
        class_id: classId,
        date: date,
        token: token,
        expires_at: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString() // Expira em 24h
      }]);
    
    if (error) throw error;
    return linkCode;
  },
  
  async validateMonitorLink(linkCode) {
    const parts = linkCode.split('-');
    if (parts.length !== 3) return null;
    
    const classId = parts[0];
    const dateStr = parts[1]; // Formato YYYYMMDD
    const token = parts[2];
    
    // Converter data de volta para o formato ISO (YYYY-MM-DD)
    const date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    
    // Verificar se o link existe e é válido
    const { data, error } = await supabase
      .from('monitor_links')
      .select('*')
      .eq('class_id', classId)
      .eq('date', date)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    return {
      classId: classId,
      date: date
    };
  }
};