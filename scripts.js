// scripts.js
document.addEventListener('DOMContentLoaded', () => {
    const addLucroBtn = document.getElementById('add-lucro-btn');
    const addGastoBtn = document.getElementById('add-gasto-btn');
    const popupAdicionar = document.getElementById('popup-adicionar');
    const popupConfirmar = document.getElementById('popup-confirmar');
    const salvarBtn = document.getElementById('salvar-btn');
    const cancelarBtn = document.getElementById('cancelar-btn');
    const confirmarBtn = document.getElementById('confirmar-btn');
    const cancelarExclusaoBtn = document.getElementById('cancelar-exclusao-btn');
    const lucroList = document.getElementById('lucro-list');
    const gastoList = document.getElementById('gasto-list');
    const balancoValor = document.getElementById('balanco-valor');
    const valorInput = document.getElementById('valor');
    const descricaoInput = document.getElementById('descricao');

    let tipoRegistro = '';
    let idExcluir = null;

    addLucroBtn.addEventListener('click', () => abrirPopup('lucro'));
    addGastoBtn.addEventListener('click', () => abrirPopup('gasto'));
    salvarBtn.addEventListener('click', salvarRegistro);
    cancelarBtn.addEventListener('click', fecharPopup);
    confirmarBtn.addEventListener('click', excluirRegistro);
    cancelarExclusaoBtn.addEventListener('click', fecharPopupConfirmar);

    lucroList.addEventListener('click', (e) => abrirPopupConfirmar(e, 'lucro'));
    gastoList.addEventListener('click', (e) => abrirPopupConfirmar(e, 'gasto'));

    valorInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            descricaoInput.focus();
        }
    });

    descricaoInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            salvarRegistro();
        }
    });

    function abrirPopup(tipo) {
        tipoRegistro = tipo;
        document.getElementById('popup-title').innerText = tipo === 'lucro' ? 'Adicionar Lucro' : 'Adicionar Despesa';
        popupAdicionar.style.display = 'flex';
        valorInput.focus();
    }

    function fecharPopup() {
        document.getElementById('valor').value = '';
        document.getElementById('descricao').value = '';
        popupAdicionar.style.display = 'none';
    }

    function salvarRegistro() {
        const valor = parseFloat(valorInput.value);
        const descricao = descricaoInput.value;
        const data = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        if (!isNaN(valor) && valor > 0) {
            const registro = { valor, descricao, data, id: Date.now() };
            const registros = JSON.parse(localStorage.getItem(tipoRegistro)) || [];
            registros.push(registro);
            localStorage.setItem(tipoRegistro, JSON.stringify(registros));

            atualizarLista(tipoRegistro);
            atualizarBalanco();
            fecharPopup();
        } else {
            alert('Por favor, insira um valor válido.');
        }
    }

    function abrirPopupConfirmar(e, tipo) {
        if (e.target.tagName === 'LI') {
            idExcluir = parseInt(e.target.dataset.id);
            tipoRegistro = tipo;
            popupConfirmar.style.display = 'flex';
        }
    }

    function fecharPopupConfirmar() {
        popupConfirmar.style.display = 'none';
    }

    function excluirRegistro() {
        const registros = JSON.parse(localStorage.getItem(tipoRegistro)) || [];
        const registrosAtualizados = registros.filter(reg => reg.id !== idExcluir);
        localStorage.setItem(tipoRegistro, JSON.stringify(registrosAtualizados));

        atualizarLista(tipoRegistro);
        atualizarBalanco();
        fecharPopupConfirmar();
    }

    function atualizarLista(tipo) {
        const registros = JSON.parse(localStorage.getItem(tipo)) || [];
        const lista = tipo === 'lucro' ? lucroList : gastoList;
        lista.innerHTML = '';

        registros.forEach(reg => {
            const li = document.createElement('li');
            li.innerText = `${reg.data} - ${reg.descricao} - R$ ${reg.valor.toFixed(2)}`;
            li.dataset.id = reg.id;
            lista.appendChild(li);
        });
    }

    function atualizarBalanco() {
        const lucros = JSON.parse(localStorage.getItem('lucro')) || [];
        const gastos = JSON.parse(localStorage.getItem('gasto')) || [];
        const totalLucros = lucros.reduce((acc, reg) => acc + reg.valor, 0);
        const totalGastos = gastos.reduce((acc, reg) => acc + reg.valor, 0);
        const balanco = totalLucros - totalGastos;

        balancoValor.innerText = `R$ ${balanco.toFixed(2)}`;
        balancoValor.classList.toggle('positivo', balanco >= 0);
        balancoValor.classList.toggle('negativo', balanco < 0);
    }

    atualizarLista('lucro');
    atualizarLista('gasto');
    atualizarBalanco();
});
