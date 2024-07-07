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
    const saldoValor = document.getElementById('saldo-valor'); // Seleciona o elemento do saldo
    const valorInput = document.getElementById('valor');
    const descricaoInput = document.getElementById('descricao');
    const totalLucrosElem = document.getElementById('total-lucros');
    const totalGastosElem = document.getElementById('total-gastos');

    const graficoPizzaCtx = document.getElementById('grafico-pizza').getContext('2d');
    const graficoLinhaCtx = document.getElementById('grafico-linha').getContext('2d');

    let graficoPizza;
    let graficoLinha;
    let tipoRegistro = '';
    let idExcluir = null;

    const restaurarBtn = document.getElementById('restaurar-btn');
    const popupRestaurar = document.getElementById('popup-restaurar');
    const cancelarRestauracaoBtn = document.getElementById('cancelar-restauracao-btn');
    const confirmarRestauracaoBtn = document.getElementById('confirmar-restauracao-btn');

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

    restaurarBtn.addEventListener('click', () => popupRestaurar.style.display = 'flex');
    cancelarRestauracaoBtn.addEventListener('click', () => popupRestaurar.style.display = 'none');
    confirmarRestauracaoBtn.addEventListener('click', restaurarMixFinance);

    function abrirPopup(tipo) {
        tipoRegistro = tipo;
        document.getElementById('popup-title').innerText = tipo === 'lucro' ? 'Adicionar Lucro' : 'Adicionar Despesa';
        popupAdicionar.style.display = 'flex';
        valorInput.focus();
    }

    function fecharPopup() {
        valorInput.value = '';
        descricaoInput.value = '';
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

        totalLucrosElem.innerText = `Total de Lucros: R$ ${totalLucros.toFixed(2)}`;
        totalLucrosElem.classList.add(totalLucros >= 0 ? 'positivo' : 'negativo');

        totalGastosElem.innerText = `Total de Gastos: R$ ${totalGastos.toFixed(2)}`;
        totalGastosElem.classList.add(totalGastos >= 0 ? 'positivo' : 'negativo');

        const saldo = balanco;
        saldoValor.innerText = `R$ ${saldo.toFixed(2)}`;
        saldoValor.classList.toggle('positivo', saldo >= 0);
        saldoValor.classList.toggle('negativo', saldo < 0);

        atualizarGraficos(totalLucros, totalGastos, lucros, gastos);
    }

    function atualizarGraficos(totalLucros, totalGastos, lucros, gastos) {
        if (graficoPizza) {
            graficoPizza.destroy();
        }

        graficoPizza = new Chart(graficoPizzaCtx, {
            type: 'pie',
            data: {
                labels: ['Lucros', 'Gastos'],
                datasets: [{
                    data: [totalLucros, totalGastos],
                    backgroundColor: ['#2ecc71', '#e74c3c']
                }]
            }
        });

        const labels = lucros.map(reg => reg.data).concat(gastos.map(reg => reg.data));
        const dataLucros = lucros.map(reg => reg.valor);
        const dataGastos = gastos.map(reg => reg.valor);

        if (graficoLinha) {
            graficoLinha.destroy();
        }

        graficoLinha = new Chart(graficoLinhaCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Lucros',
                        data: dataLucros,
                        borderColor: '#2ecc71',
                        fill: false
                    },
                    {
                        label: 'Gastos',
                        data: dataGastos,
                        borderColor: '#e74c3c',
                        fill: false
                    }
                ]
            }
        });
    }

    function restaurarMixFinance() {
        localStorage.removeItem('lucro');
        localStorage.removeItem('gasto');
        atualizarLista('lucro');
        atualizarLista('gasto');
        atualizarBalanco();
        popupRestaurar.style.display = 'none';
    }

    atualizarLista('lucro');
    atualizarLista('gasto');
    atualizarBalanco();
});
