document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const nombreInput = document.getElementById('nombreAlumno');
    const comentarioInput = document.getElementById('comentarioAlumno');
    const completadoCheck = document.getElementById('completadoCheck');
    const agregarBtn = document.getElementById('agregarBtn');
    const listaAlumnos = document.getElementById('listaAlumnos');
    const totalAlumnos = document.getElementById('totalAlumnos');
    const completadosAlumnos = document.getElementById('completadosAlumnos');
    const pendientesAlumnos = document.getElementById('pendientesAlumnos');
    const filtroBtns = document.querySelectorAll('.filtro-btn');
    
    // Cargar alumnos desde localStorage
    let alumnos = JSON.parse(localStorage.getItem('alumnos')) || [];
    let filtroActual = 'todos';
    
    // Inicializar la aplicación
    actualizarContadores();
    renderizarAlumnos();
    
    // Evento para agregar alumno
    agregarBtn.addEventListener('click', agregarAlumno);
    
    // También permitir agregar con Enter en el nombre
    nombreInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') agregarAlumno();
    });
    
    // Eventos para los filtros
    filtroBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filtroBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filtroActual = this.getAttribute('data-filtro');
            renderizarAlumnos();
        });
    });
    
    // Función para agregar un nuevo alumno
    function agregarAlumno() {
        const nombre = nombreInput.value.trim();
        const comentario = comentarioInput.value.trim();
        const completado = completadoCheck.checked;
        
        // Validación
        if (nombre === '') {
            mostrarNotificacion('Por favor, escribe el nombre del alumno', 'error');
            nombreInput.focus();
            return;
        }
        
        // Crear nuevo alumno
        const nuevoAlumno = {
            id: Date.now(),
            nombre: nombre,
            comentario: comentario,
            completado: completado,
            fechaRegistro: new Date().toISOString()
        };
        
        // Agregar a la lista
        alumnos.push(nuevoAlumno);
        
        // Limpiar formulario
        nombreInput.value = '';
        comentarioInput.value = '';
        completadoCheck.checked = false;
        
        // Guardar y actualizar
        guardarAlumnos();
        renderizarAlumnos();
        mostrarNotificacion('Alumno agregado exitosamente', 'success');
        nombreInput.focus();
    }
    
    // Función para renderizar la lista de alumnos
    function renderizarAlumnos() {
        // Filtrar alumnos según el filtro actual
        let alumnosFiltrados = alumnos;
        
        if (filtroActual === 'completados') {
            alumnosFiltrados = alumnos.filter(a => a.completado);
        } else if (filtroActual === 'pendientes') {
            alumnosFiltrados = alumnos.filter(a => !a.completado);
        }
        
        // Ordenar: pendientes primero, luego por fecha (más recientes primero)
        alumnosFiltrados.sort((a, b) => {
            if (a.completado !== b.completado) {
                return a.completado ? 1 : -1; // Pendientes primero
            }
            return new Date(b.fechaRegistro) - new Date(a.fechaRegistro);
        });
        
        // Mostrar mensaje si no hay alumnos
        if (alumnosFiltrados.length === 0) {
            let mensaje = '';
            let icono = 'fa-user-graduate';
            
            if (filtroActual === 'todos') {
                mensaje = 'No hay alumnos registrados';
                icono = 'fa-user-plus';
            } else if (filtroActual === 'completados') {
                mensaje = 'No hay alumnos completados';
                icono = 'fa-check-circle';
            } else if (filtroActual === 'pendientes') {
                mensaje = '¡Excelente! Todos los alumnos están completados';
                icono = 'fa-trophy';
            }
            
            listaAlumnos.innerHTML = `
                <div class="estado-vacio">
                    <i class="fas ${icono}"></i>
                    <h3>${mensaje}</h3>
                    <p>Usa el formulario de arriba para agregar un nuevo alumno</p>
                </div>
            `;
            return;
        }
        
        // Generar HTML para cada alumno
        listaAlumnos.innerHTML = '';
        
        alumnosFiltrados.forEach(alumno => {
            const alumnoItem = document.createElement('div');
            alumnoItem.className = `alumno-item ${alumno.completado ? 'completado' : 'pendiente'}`;
            alumnoItem.dataset.id = alumno.id;
            
            alumnoItem.innerHTML = `
                <div class="alumno-header">
                    <div class="nombre-alumno" contenteditable="true" data-campo="nombre">
                        ${escapeHTML(alumno.nombre)}
                    </div>
                    <div class="estado-badge ${alumno.completado ? 'estado-completado' : 'estado-pendiente'}" 
                         data-id="${alumno.id}">
                        <i class="fas ${alumno.completado ? 'fa-check' : 'fa-clock'}"></i>
                        ${alumno.completado ? 'Completado' : 'Pendiente'}
                    </div>
                </div>
                
                <div class="comentario-alumno" contenteditable="true" data-campo="comentario">
                    ${escapeHTML(alumno.comentario)}
                </div>
                
                <div class="alumno-acciones">
                    <button class="btn-eliminar eliminar-alumno" data-id="${alumno.id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
            
            listaAlumnos.appendChild(alumnoItem);
        });
        
        // Agregar event listeners a los elementos editables
        document.querySelectorAll('.nombre-alumno[contenteditable="true"]').forEach(element => {
            element.addEventListener('blur', editarCampo);
            element.addEventListener('focus', function() {
                this.classList.add('editando');
            });
            element.addEventListener('blur', function() {
                this.classList.remove('editando');
            });
        });
        
        document.querySelectorAll('.comentario-alumno[contenteditable="true"]').forEach(element => {
            element.addEventListener('blur', editarCampo);
            element.addEventListener('focus', function() {
                this.classList.add('editando');
            });
            element.addEventListener('blur', function() {
                this.classList.remove('editando');
            });
        });
        
        // Agregar event listeners a los badges de estado
        document.querySelectorAll('.estado-badge').forEach(badge => {
            badge.addEventListener('click', toggleEstado);
        });
        
        // Agregar event listeners a los botones de eliminar
        document.querySelectorAll('.eliminar-alumno').forEach(btn => {
            btn.addEventListener('click', eliminarAlumno);
        });
        
        actualizarContadores();
    }
    
    // Función para editar campos (nombre o comentario)
    function editarCampo(e) {
        const elemento = e.target;
        const alumnoId = parseInt(elemento.closest('.alumno-item').dataset.id);
        const campo = elemento.getAttribute('data-campo');
        const nuevoValor = elemento.textContent.trim();
        
        const alumno = alumnos.find(a => a.id === alumnoId);
        
        if (alumno) {
            if (campo === 'nombre' && nuevoValor === '') {
                elemento.textContent = alumno.nombre;
                mostrarNotificacion('El nombre no puede estar vacío', 'error');
                return;
            }
            
            alumno[campo] = nuevoValor;
            guardarAlumnos();
            mostrarNotificacion(`${campo === 'nombre' ? 'Nombre' : 'Comentario'} actualizado`, 'info');
        }
    }
    
    // Función para alternar estado (completado/pendiente)
    function toggleEstado(e) {
        const alumnoId = parseInt(e.currentTarget.dataset.id);
        const alumno = alumnos.find(a => a.id === alumnoId);
        
        if (alumno) {
            alumno.completado = !alumno.completado;
            guardarAlumnos();
            renderizarAlumnos();
            
            const mensaje = alumno.completado 
                ? 'Alumno marcado como completado' 
                : 'Alumno marcado como pendiente';
            mostrarNotificacion(mensaje, 'info');
        }
    }
    
    // Función para eliminar alumno
    function eliminarAlumno(e) {
        const alumnoId = parseInt(e.currentTarget.dataset.id);
        
        if (confirm('¿Estás seguro de que quieres eliminar este alumno?')) {
            alumnos = alumnos.filter(a => a.id !== alumnoId);
            guardarAlumnos();
            renderizarAlumnos();
            mostrarNotificacion('Alumno eliminado', 'error');
        }
    }
    
    // Función para actualizar contadores
    function actualizarContadores() {
        const total = alumnos.length;
        const completados = alumnos.filter(a => a.completado).length;
        const pendientes = total - completados;
        
        totalAlumnos.textContent = total;
        completadosAlumnos.textContent = completados;
        pendientesAlumnos.textContent = pendientes;
    }
    
    // Función para guardar en localStorage
    function guardarAlumnos() {
        localStorage.setItem('alumnos', JSON.stringify(alumnos));
        actualizarContadores();
    }
    
    // Función para mostrar notificaciones
    function mostrarNotificacion(mensaje, tipo) {
        // Eliminar notificación anterior si existe
        const notificacionExistente = document.querySelector('.notificacion');
        if (notificacionExistente) {
            notificacionExistente.remove();
        }
        
        // Crear nueva notificación
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion notificacion-${tipo}`;
        
        const icono = tipo === 'success' ? 'fa-check-circle' : 
                     tipo === 'error' ? 'fa-exclamation-circle' : 
                     'fa-info-circle';
        
        notificacion.innerHTML = `
            <i class="fas ${icono}"></i>
            <span>${mensaje}</span>
        `;
        
        // Estilos
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${tipo === 'success' ? '#4CAF50' : tipo === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 5px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: deslizarEntrada 0.3s ease;
        `;
        
        document.body.appendChild(notificacion);
        
        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            notificacion.style.animation = 'deslizarSalida 0.3s ease';
            setTimeout(() => notificacion.remove(), 300);
        }, 3000);
        
        // Agregar estilos de animación si no existen
        if (!document.querySelector('#estilos-notificacion')) {
            const estilo = document.createElement('style');
            estilo.id = 'estilos-notificacion';
            estilo.textContent = `
                @keyframes deslizarEntrada {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes deslizarSalida {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(estilo);
        }
    }
    
    // Función para escapar HTML (seguridad básica)
    function escapeHTML(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }
    
    // Cargar algunos alumnos de ejemplo si no hay ninguno
    if (alumnos.length === 0) {
        alumnos = [
            {
                id: 1,
                nombre: 'Ana García',
                comentario: 'Excelente desempeño en el último proyecto. Muy participativa.',
                completado: true,
                fechaRegistro: new Date().toISOString()
            },
            {
                id: 2,
                nombre: 'Carlos Rodríguez',
                comentario: 'Necesita apoyo en matemáticas. Programar tutoría.',
                completado: false,
                fechaRegistro: new Date().toISOString()
            },
            {
                id: 3,
                nombre: 'María López',
                comentario: 'Entrega siempre sus trabajos a tiempo. Muy responsable.',
                completado: true,
                fechaRegistro: new Date().toISOString()
            },
            {
                id: 4,
                nombre: 'Pedro Sánchez',
                comentario: 'Faltó a clase la semana pasada. Contactar a padres.',
                completado: false,
                fechaRegistro: new Date().toISOString()
            }
        ];
        
        guardarAlumnos();
        renderizarAlumnos();
    }
});