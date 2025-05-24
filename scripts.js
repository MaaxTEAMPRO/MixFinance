let transactions = JSON.parse(localStorage.getItem('mixfinance_transactions')) || [];
let categories = JSON.parse(localStorage.getItem('mixfinance_categories')) || [];
let reserves = JSON.parse(localStorage.getItem('mixfinance_reserves')) || [];
let currentTransactionType = 'income';
let currentReserveId = null;
let charts = {};

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando eventos...');
    
    initializeDefaultCategories();
    setupTabs();
    setupDateInput();
    updateDashboard();
    renderAll();

    // Eventos para fechar modais
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
});

function initializeDefaultCategories() {
    if (categories.length === 0) {
        categories = [
            { id: 1, name: 'Salário', type: 'income', color: '#10b981' },
            { id: 2, name: 'Freelance', type: 'income', color: '#059669' },
            { id: 3, name: 'Alimentação', type: 'expense', color: '#ef4444' },
            { id: 4, name: 'Transporte', type: 'expense', color: '#f59e0b' },
            { id: 5, name: 'Lazer', type: 'expense', color: '#8b5cf6' },
            { id: 6, name: 'Contas', type: 'expense', color: '#dc2626' }
        ];
        saveData();
    }
}

function setupTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    if (tabName === 'dashboard') updateDashboard();
    if (tabName === 'transactions') renderTransactions();
    if (tabName === 'categories') renderCategories();
    if (tabName === 'reserves') renderReserves();
    if (tabName === 'reports') generateReport();
}

function setupDateInput() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;
}

function saveData() {
    localStorage.setItem('mixfinance_transactions', JSON.stringify(transactions));
    localStorage.setItem('mixfinance_categories', JSON.stringify(categories));
    localStorage.setItem('mixfinance_reserves', JSON.stringify(reserves));
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// ========== DASHBOARD ==========
function calculateTotals() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expenses;
    const totalReserves = reserves.reduce((sum, r) => sum + r.currentAmount, 0);
    return { income, expenses, balance, totalReserves };
}

function updateDashboard() {
    if (charts.overview) charts.overview.destroy();
    if (charts.category) charts.category.destroy();
    if (charts.monthly) charts.monthly.destroy();
    
    const { income, expenses, balance, totalReserves } = calculateTotals();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const monthlyBalance = monthlyIncome - monthlyExpenses;
    
    const balanceEl = document.getElementById('currentBalance');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(balance);
        balanceEl.className = `balance-value ${balance >= 0 ? 'positive' : 'negative'}`;
    }
    
    const totalIncomeEl = document.getElementById('totalIncome');
    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(income);
    
    const totalExpensesEl = document.getElementById('totalExpenses');
    if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(expenses);
    
    const monthlyBalanceEl = document.getElementById('monthlyBalance');
    if (monthlyBalanceEl) {
        monthlyBalanceEl.textContent = formatCurrency(monthlyBalance);
        monthlyBalanceEl.style.color = monthlyBalance >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    
    const totalReservesEl = document.getElementById('totalReserves');
    if (totalReservesEl) totalReservesEl.textContent = formatCurrency(totalReserves);
    
    const transactionCountEl = document.getElementById('transactionCount');
    if (transactionCountEl) transactionCountEl.textContent = transactions.length;
    
    renderOverviewChart();
    renderCategoryChart();
    renderMonthlyChart();
    renderRecentTransactions();
}

function renderOverviewChart() {
    const ctx = document.getElementById('overviewChart').getContext('2d');
    const { income, expenses } = calculateTotals();
    
    charts.overview = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{
                data: [income, expenses],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f8fafc' }
                }
            }
        }
    });
}

function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const expensesByCategory = {};
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const category = categories.find(c => c.id === t.categoryId);
        const categoryName = category ? category.name : 'Outros';
        expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + t.amount;
    });
    
    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    const colors = labels.map(label => {
        const category = categories.find(c => c.name === label);
        return category ? category.color : '#6366f1';
    });
    
    charts.category = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f8fafc' }
                }
            }
        }
    });
}

function renderMonthlyChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    const monthlyData = {};
    
    transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expenses: 0 };
        }
        if (t.type === 'income') {
            monthlyData[monthKey].income += t.amount;
        } else {
            monthlyData[monthKey].expenses += t.amount;
        }
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return new Date(year, monthNum - 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    });
    
    const incomeData = sortedMonths.map(month => monthlyData[month].income);
    const expenseData = sortedMonths.map(month => monthlyData[month].expenses);
    
    charts.monthly = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Despesas',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f8fafc' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#cbd5e1' },
                    grid: { color: '#475569' }
                },
                y: {
                    ticks: { 
                        color: '#cbd5e1',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: { color: '#475569' }
                }
            }
        }
    });
}

function renderRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    const recent = transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    container.innerHTML = recent.map(t => {
        const category = categories.find(c => c.id === t.categoryId);
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-desc">${t.description}</div>
                    <div class="transaction-meta">
                        ${new Date(t.date).toLocaleDateString('pt-BR')} • 
                        <span class="category-tag" style="background: ${category?.color || '#6366f1'}">
                            ${category?.name || 'Outros'}
                        </span>
                    </div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </div>
            </div>
        `;
    }).join('');
}

// ========== TRANSAÇÕES ==========
function openTransactionModal(type) {
    try {
        console.log('Abrindo modal de transação:', type);
        currentTransactionType = type;
        document.getElementById('transactionModalTitle').textContent = 
            type === 'income' ? 'Nova Receita' : 'Nova Despesa';
        
        const categorySelect = document.getElementById('transactionCategory');
        const relevantCategories = categories.filter(c => c.type === type);
        categorySelect.innerHTML = relevantCategories.map(c => 
            `<option value="${c.id}">${c.name}</option>`
        ).join('');
        
        openModal('transactionModal');
        document.getElementById('transactionAmount').focus();
    } catch (error) {
        console.error('Erro ao abrir modal de transação:', error);
    }
}

function saveTransaction(event) {
    event.preventDefault();
    const transaction = {
        id: Date.now(),
        type: currentTransactionType,
        amount: parseFloat(document.getElementById('transactionAmount').value),
        description: document.getElementById('transactionDescription').value,
        categoryId: parseInt(document.getElementById('transactionCategory').value),
        date: document.getElementById('transactionDate').value
    };
    
    transactions.push(transaction);
    saveData();
    closeModal('transactionModal');
    updateDashboard();
    renderTransactions();
    
    document.getElementById('transactionAmount').value = '';
    document.getElementById('transactionDescription').value = '';
}

function renderTransactions() {
    populateFilters();
    filterTransactions();
}

function populateFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="all">Todas</option>' + 
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function filterTransactions() {
    const periodFilter = document.getElementById('periodFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const now = new Date();
    let filtered = transactions.slice();

    if (periodFilter === 'thisMonth') {
        filtered = filtered.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
    } else if (periodFilter === 'lastMonth') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        filtered = filtered.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
        });
    } else if (periodFilter === 'thisYear') {
        filtered = filtered.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
    }
    
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => t.categoryId === parseInt(categoryFilter));
    }
    
    if (typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    const container = document.getElementById('allTransactions');
    container.innerHTML = filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => {
        const category = categories.find(c => c.id === t.categoryId);
        return `
            <div class="transaction-item" onclick="editTransaction(${t.id})">
                <div class="transaction-info">
                    <div class="transaction-desc">${t.description}</div>
                    <div class="transaction-meta">
                        ${new Date(t.date).toLocaleDateString('pt-BR')} • 
                        <span class="category-tag" style="background: ${category?.color || '#6366f1'}">
                            ${category?.name || 'Outros'}
                        </span>
                    </div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </div>
            </div>
        `;
    }).join('');
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    const category = categories.find(c => c.id === transaction.categoryId);
    const message = `Deseja excluir esta transação?\n\n` +
        `Descrição: ${transaction.description}\n` +
        `Valor: ${formatCurrency(transaction.amount)}\n` +
        `Categoria: ${category ? category.name : 'Outros'}\n` +
        `Data: ${new Date(transaction.date).toLocaleDateString('pt-BR')}`;
    
    if (confirm(message)) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateDashboard();
        renderTransactions();
    }
}

// ========== CATEGORIAS ==========
function openCategoryModal() {
    document.getElementById('categoryModal').classList.add('active');
    document.getElementById('categoryName').focus();
}

function saveCategory(event) {
    event.preventDefault();
    const category = {
        id: Date.now(),
        name: document.getElementById('categoryName').value,
        type: document.getElementById('categoryType').value,
        color: document.getElementById('categoryColor').value
    };
    
    categories.push(category);
    saveData();
    closeModal('categoryModal');
    renderCategories();
    
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryType').value = 'expense';
    document.getElementById('categoryColor').value = '#6366f1';
}

function renderCategories() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = categories.map(c => `
        <div class="card" onclick="editCategory(${c.id})" style="cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <div style="width: 20px; height: 20px; border-radius: 50%; background: ${c.color};"></div>
                <h4>${c.name}</h4>
            </div>
            <p style="color: var(--text-secondary); text-transform: capitalize;">${c.type === 'income' ? 'Receita' : 'Despesa'}</p>
        </div>
    `).join('');
}

function editCategory(id) {
    if (confirm('Deseja excluir esta categoria?')) {
        categories = categories.filter(c => c.id !== id);
        saveData();
        renderCategories();
    }
}

// ========== RESERVAS E METAS ==========
function openReserveModal(editId = null) {
    const modal = document.getElementById('reserveModal');
    if (!modal) return;

    if (editId) {
        const reserve = reserves.find(r => r.id === editId);
        if (reserve) {
            document.getElementById('reserveName').value = reserve.name;
            document.getElementById('reserveDescription').value = reserve.description || '';
            document.getElementById('reserveInitialAmount').value = reserve.currentAmount;
            document.getElementById('reserveModalTitle').textContent = 'Editar Reserva';
            modal.dataset.editId = editId;
        }
    } else {
        resetReserveForm();
    }

    modal.classList.add('active');
    document.getElementById('reserveName').focus();
}

function saveReserve(event) {
    event.preventDefault();
    const reserveData = {
        name: document.getElementById('reserveName').value,
        description: document.getElementById('reserveDescription').value,
        currentAmount: parseFloat(document.getElementById('reserveInitialAmount').value) || 0
    };

    const modal = document.getElementById('reserveModal');
    const editId = modal.dataset.editId;
    
    if (editId) {
        const reserve = reserves.find(r => r.id === parseInt(editId));
        if (reserve) {
            reserve.name = reserveData.name;
            reserve.description = reserveData.description;
            reserve.currentAmount = reserveData.currentAmount;
        }
    } else {
        const reserve = {
            id: Date.now(),
            ...reserveData,
            goals: [],
            history: []
        };
        reserves.push(reserve);
    }

    saveData();
    closeModal('reserveModal');
    renderReserves();
    resetReserveForm();
}

function resetReserveForm() {
    const reserveNameEl = document.getElementById('reserveName');
    if (reserveNameEl) reserveNameEl.value = '';
    
    const reserveDescriptionEl = document.getElementById('reserveDescription');
    if (reserveDescriptionEl) reserveDescriptionEl.value = '';
    
    const reserveInitialAmountEl = document.getElementById('reserveInitialAmount');
    if (reserveInitialAmountEl) reserveInitialAmountEl.value = '0';
    
    const reserveModalTitleEl = document.getElementById('reserveModalTitle');
    if (reserveModalTitleEl) reserveModalTitleEl.textContent = 'Nova Reserva';
    
    const reserveModal = document.getElementById('reserveModal');
    if (reserveModal) delete reserveModal.dataset.editId;
}

function renderReserves() {
    const container = document.getElementById('reservesList');
    container.innerHTML = reserves.map(r => `
        <div class="card reserve-card" onclick="showReserveDetails(${r.id})">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>${r.name}</h3>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editReserve(${r.id})">Editar</button>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">${r.description || 'Sem descrição'}</p>
            <div class="stat-value">${formatCurrency(r.currentAmount)}</div>
            <p style="color: var(--text-secondary);">${r.goals.length} metas</p>
        </div>
    `).join('');
}

function showReserveDetails(id) {
    currentReserveId = id;
    const reserve = reserves.find(r => r.id === id);
    if (!reserve) return;
    
    document.getElementById('reserveDetailsTitle').textContent = reserve.name;
    
    // Adiciona botão de excluir ao lado do título
    const titleContainer = document.getElementById('reserveDetailsTitle').parentElement;
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-danger btn-sm';
    deleteButton.innerHTML = '🗑️ Excluir Reserva';
    deleteButton.onclick = () => {
        if (confirm(`Tem certeza que deseja excluir a reserva "${reserve.name}"? Esta ação não pode ser desfeita.`)) {
            reserves = reserves.filter(r => r.id !== id);
            saveData();
            document.getElementById('reserveDetailsCard').style.display = 'none';
            renderReserves();
            updateDashboard();
        }
    };
    titleContainer.appendChild(deleteButton);
    
    document.getElementById('reserveCurrentAmount').textContent = formatCurrency(reserve.currentAmount);
    
    const goalsTotal = reserve.goals.reduce((sum, g) => sum + g.target, 0);
    document.getElementById('reserveGoalsTotal').textContent = formatCurrency(goalsTotal);
    document.getElementById('reserveAvailable').textContent = formatCurrency(reserve.currentAmount - goalsTotal);
    document.getElementById('reserveGoalsCount').textContent = reserve.goals.length;
    
    const goalsContainer = document.getElementById('reserveGoalsList');
    goalsContainer.innerHTML = reserve.goals.map(g => {
        const progress = (g.current / g.target) * 100;
        const isOverdue = g.deadline && new Date(g.deadline) < new Date();
        return `
            <div class="reserve-goal" onclick="editReserveGoal(${reserve.id}, ${g.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4>${g.name}</h4>
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editReserveGoal(${reserve.id}, ${g.id})">Editar</button>
                </div>
                <div style="margin: 1rem 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>${formatCurrency(g.current)}</span>
                        <span>${formatCurrency(g.target)}</span>
                    </div>
                    <div class="reserve-progress">
                        <div class="reserve-progress-bar" style="width: ${Math.min(progress, 100)}%; background: ${progress >= 100 ? 'var(--success)' : 'var(--primary)'};"></div>
                    </div>
                    <div style="text-align: center; margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                        ${Math.round(progress)}% concluído
                        ${g.deadline ? `• ${isOverdue ? '⚠️ Atrasado' : 'Prazo: ' + new Date(g.deadline).toLocaleDateString('pt-BR')}` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const historyContainer = document.getElementById('reserveHistory');
    historyContainer.innerHTML = reserve.history.slice().reverse().map(h => `
        <div class="reserve-history-item">
            <div>
                <div style="font-weight: 600;">${h.description || 'Movimentação'}</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">
                    ${new Date(h.date).toLocaleDateString('pt-BR')} • 
                    <span class="category-tag">${h.type === 'deposit' ? 'Depósito' : 'Saque'}</span>
                </div>
            </div>
            <div class="${h.type}" style="font-weight: 700;">
                ${h.type === 'deposit' ? '+' : '-'}${formatCurrency(h.amount)}
            </div>
        </div>
    `).join('');
    
    document.getElementById('reserveDetailsCard').style.display = 'block';
}

function editReserve(id) {
    openReserveModal(id);
}

function editReserveGoal(reserveId, goalId) {
    const reserve = reserves.find(r => r.id === reserveId);
    if (!reserve) return;

    const goal = reserve.goals.find(g => g.id === goalId);
    if (!goal) return;

    const action = prompt('Digite:\n"excluir" para remover\n"editar" para alterar\nou um valor para adicionar progresso');
    
    if (action === 'excluir') {
        if (confirm('Tem certeza que deseja excluir esta meta?')) {
            reserve.goals = reserve.goals.filter(g => g.id !== goalId);
            saveData();
            showReserveDetails(reserveId);
        }
    } else if (action === 'editar') {
        document.getElementById('goalName').value = goal.name;
        document.getElementById('goalTarget').value = goal.target;
        document.getElementById('goalDeadline').value = goal.deadline || '';
        
        const modal = document.getElementById('goalModal');
        modal.querySelector('.modal-title').textContent = 'Editar Meta';
        modal.dataset.editReserveId = reserveId;
        modal.dataset.editGoalId = goalId;
        modal.classList.add('active');
    } else if (action && !isNaN(parseFloat(action))) {
        goal.current += parseFloat(action);
        saveData();
        showReserveDetails(reserveId);
    }
}

function openGoalModal() {
    if (!currentReserveId) {
        alert('Por favor, selecione uma reserva primeiro.');
        return;
    }
    resetGoalForm();
    document.getElementById('goalModal').classList.add('active');
    document.getElementById('goalName').focus();
}

function saveGoal(event) {
    event.preventDefault();
    if (!currentReserveId) return;
    
    const reserve = reserves.find(r => r.id === currentReserveId);
    if (!reserve) return;

    const goalData = {
        name: document.getElementById('goalName').value,
        target: parseFloat(document.getElementById('goalTarget').value),
        deadline: document.getElementById('goalDeadline').value,
        current: 0
    };

    const modal = document.getElementById('goalModal');
    const editGoalId = modal.dataset.editGoalId;
    
    if (editGoalId) {
        const goal = reserve.goals.find(g => g.id === parseInt(editGoalId));
        if (goal) {
            goal.name = goalData.name;
            goal.target = goalData.target;
            goal.deadline = goalData.deadline;
        }
    } else {
        const goal = {
            id: Date.now(),
            ...goalData
        };
        
        // Calcula o valor disponível para a nova meta
        const totalAllocated = reserve.goals.reduce((sum, g) => sum + g.current, 0);
        const availableAmount = reserve.currentAmount - totalAllocated;
        
        // Aloca o valor disponível para a nova meta, até o limite do target
        if (availableAmount > 0) {
            goal.current = Math.min(availableAmount, goal.target);
        }
        
        reserve.goals.push(goal);
    }

    saveData();
    closeModal('goalModal');
    showReserveDetails(currentReserveId);
    resetGoalForm();
}

function resetGoalForm() {
    const goalNameEl = document.getElementById('goalName');
    if (goalNameEl) goalNameEl.value = '';
    
    const goalTargetEl = document.getElementById('goalTarget');
    if (goalTargetEl) goalTargetEl.value = '';
    
    const goalDeadlineEl = document.getElementById('goalDeadline');
    if (goalDeadlineEl) goalDeadlineEl.value = '';
    
    const goalModalTitleEl = document.getElementById('goalModalTitle');
    if (goalModalTitleEl) goalModalTitleEl.textContent = 'Nova Meta';
    
    const goalModal = document.getElementById('goalModal');
    if (goalModal) {
        delete goalModal.dataset.editReserveId;
        delete goalModal.dataset.editGoalId;
    }
}

function openDepositModal() {
    if (!currentReserveId) return;
    document.getElementById('depositModal').classList.add('active');
    document.getElementById('depositAmount').focus();
}

function updateGoalsProgress(reserve, amount, isDeposit = true) {
    if (!reserve.goals || reserve.goals.length === 0) return;

    // Ordena as metas por data de criação (ID)
    const sortedGoals = [...reserve.goals].sort((a, b) => a.id - b.id);
    
    if (isDeposit) {
        // Para depósitos, distribui o dinheiro entre as metas não completadas
        let remainingAmount = amount;
        
        for (const goal of sortedGoals) {
            if (remainingAmount <= 0) break;
            
            const remaining = goal.target - goal.current;
            if (remaining > 0) {
                const allocation = Math.min(remainingAmount, remaining);
                goal.current += allocation;
                remainingAmount -= allocation;
            }
        }
    } else {
        // Para saques, remove proporcionalmente das metas
        const totalGoalAmount = sortedGoals.reduce((sum, g) => sum + g.current, 0);
        if (totalGoalAmount <= 0) return;
        
        const ratio = amount / totalGoalAmount;
        for (const goal of sortedGoals) {
            goal.current = Math.max(0, goal.current - (goal.current * ratio));
        }
    }
}

function makeDeposit(event) {
    event.preventDefault();
    if (!currentReserveId) return;
    
    const reserve = reserves.find(r => r.id === currentReserveId);
    if (!reserve) return;
    
    const amount = parseFloat(document.getElementById('depositAmount').value);
    if (isNaN(amount)) return;
    
    reserve.currentAmount += amount;
    reserve.history.push({
        type: 'deposit',
        amount,
        description: document.getElementById('depositDescription').value || 'Depósito',
        date: new Date().toISOString()
    });
    
    // Atualiza o progresso das metas com o novo depósito
    updateGoalsProgress(reserve, amount, true);
    
    saveData();
    closeModal('depositModal');
    showReserveDetails(currentReserveId);
    updateDashboard();
    document.getElementById('depositAmount').value = '';
    document.getElementById('depositDescription').value = '';
}

function openWithdrawModal() {
    if (!currentReserveId) return;
    document.getElementById('withdrawModal').classList.add('active');
    document.getElementById('withdrawAmount').focus();
}

function makeWithdraw(event) {
    event.preventDefault();
    if (!currentReserveId) return;
    
    const reserve = reserves.find(r => r.id === currentReserveId);
    if (!reserve) return;
    
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    if (isNaN(amount)) return;
    
    if (amount > reserve.currentAmount) {
        alert('Saldo insuficiente na reserva');
        return;
    }
    
    reserve.currentAmount -= amount;
    reserve.history.push({
        type: 'withdraw',
        amount,
        description: document.getElementById('withdrawDescription').value || 'Saque',
        date: new Date().toISOString()
    });
    
    // Atualiza o progresso das metas com o saque
    updateGoalsProgress(reserve, amount, false);
    
    saveData();
    closeModal('withdrawModal');
    showReserveDetails(currentReserveId);
    updateDashboard();
    document.getElementById('withdrawAmount').value = '';
    document.getElementById('withdrawDescription').value = '';
}

// ========== RELATÓRIOS ==========
function generateReport() {
    const period = document.getElementById('reportPeriod').value;
    const container = document.getElementById('reportContent');
    let filteredTransactions = [];
    const now = new Date();

    if (period === 'thisMonth') {
        filteredTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
    } else if (period === 'lastMonth') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        filteredTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
        });
    } else if (period === 'thisYear') {
        filteredTransactions = transactions.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
    } else if (period === 'lastYear') {
        filteredTransactions = transactions.filter(t => new Date(t.date).getFullYear() === now.getFullYear() - 1);
    }

    const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expenses;

    const categoryAnalysis = {};
    filteredTransactions.forEach(t => {
        const category = categories.find(c => c.id === t.categoryId);
        const categoryName = category ? category.name : 'Outros';
        if (!categoryAnalysis[categoryName]) {
            categoryAnalysis[categoryName] = { income: 0, expenses: 0, count: 0 };
        }
        if (t.type === 'income') {
            categoryAnalysis[categoryName].income += t.amount;
        } else {
            categoryAnalysis[categoryName].expenses += t.amount;
        }
        categoryAnalysis[categoryName].count++;
    });

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" style="color: var(--success)">${formatCurrency(income)}</div>
                <div class="stat-label">Total de Receitas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--danger)">${formatCurrency(expenses)}</div>
                <div class="stat-label">Total de Despesas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: ${balance >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(balance)}</div>
                <div class="stat-label">Saldo do Período</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${filteredTransactions.length}</div>
                <div class="stat-label">Transações</div>
            </div>
        </div>       
        <div class="card">
            <h3 class="card-title">Análise por Categoria</h3>
            ${Object.entries(categoryAnalysis).map(([name, data]) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 0.5rem;">
                    <span>${name}</span>
                    <div style="text-align: right;">
                        <div>${data.count} transações</div>
                        <div style="color: ${data.income > 0 ? 'var(--success)' : 'var(--danger)'}">
                            ${formatCurrency(data.income > 0 ? data.income : data.expenses)}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ========== BACKUP E RESTAURAÇÃO ==========
function exportData() {
    const data = {
        transactions,
        categories,
        reserves,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mixfinance-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('Isso substituirá todos os dados atuais. Deseja continuar?')) {
                transactions = data.transactions || [];
                categories = data.categories || [];
                reserves = data.reserves || [];
                saveData();
                renderAll();
                alert('Dados importados com sucesso!');
            }
        } catch (error) {
            alert('Erro ao importar dados. Verifique se o arquivo está correto.');
        }
    };
    reader.readAsText(file);
}

function resetAllData() {
    if (confirm('Isso apagará TODOS os seus dados permanentemente. Tem certeza?')) {
        if (confirm('Última confirmação: Realmente deseja apagar tudo?')) {
            localStorage.clear();
            transactions = [];
            categories = [];
            reserves = [];
            initializeDefaultCategories();
            renderAll();
            alert('Todos os dados foram apagados!');
        }
    }
}

// ========== FUNÇÕES GERAIS ==========
function openModal(modalId) {
    try {
        console.log('Abrindo modal:', modalId);
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('Modal não encontrado:', modalId);
            return;
        }
        modal.classList.add('active');
    } catch (error) {
        console.error('Erro ao abrir modal:', error);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function renderAll() {
    updateDashboard();
    renderTransactions();
    renderCategories();
    renderReserves();
    generateReport();
}
