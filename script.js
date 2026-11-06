
let products = [];
let users = [];
let currentUser = null;
const $ = s => document.querySelector(s);
const modal = $('#modal');

async function load() {
    const savedProducts = localStorage.getItem('products');

    if (savedProducts) {
        products = JSON.parse(savedProducts);
    } else {
        products = await fetch('./BD/products.json').then(r => r.json());
    }

    users = await fetch('./BD/users.json').then(r => r.json());

    render();
}

function render() {
    const q = $('#search').value.toLowerCase(), cat = $('#category').value, size = $('#size').value;
    const list = products.filter(p => (p.title + ' ' + p.brand).toLowerCase().includes(q) && (cat === 'Todas' || p.category === cat) && (size === 'Todos' || p.size === size)); $('#products').innerHTML = list.map(p => `<article class="card" data-id="${p.id}"><img src="${p.image}" alt="${p.title}"><h3>${p.title}<span class="price">R$ ${Number(p.price).toFixed(2).replace('.', ',')}</span></h3><p>${p.brand} · Tam. ${p.size} · ${p.status}</p></article>`).join('') || '<p>Nenhuma peça encontrada.</p>'; document.querySelectorAll('.card').forEach(c => c.onclick = () => detail(products.find(p => p.id == c.dataset.id)))
}
function detail(p) {
    modal.innerHTML = `<div class="box"><button class="close" onclick="closeModal()">×</button><img src="${p.image}" style="width:100%;height:220px;object-fit:cover" alt="${p.title}"><h2>${p.title}</h2><p>${p.brand} · Tamanho ${p.size} · ${p.condition}</p><h3>R$ ${Number(p.price).toFixed(2).replace('.', ',')}</h3><p>Anunciado por <b>${p.seller}</b><br>${p.sellerEmail}</p><button class="primary" onclick="alert('Entre em contato pelo e-mail do anunciante.')">Tenho interesse</button></div>`; modal.classList.remove('hidden')
}
function auth() {
    modal.innerHTML = `<form class="box" id="authForm"><button type="button" class="close" onclick="closeModal()">×</button><small>ÁREA DO USUÁRIO</small><h2>Bem-vindo<br><i>de volta.</i></h2><label>E-mail<input id="email" type="email" required></label><label>Senha<input id="password" type="password" required minlength="6"></label><p id="error" class="error"></p><button class="primary">Entrar</button><p><button type="button" class="text-btn" onclick="register()">Ainda não tenho conta — criar agora</button></p></form>`; modal.classList.remove('hidden'); $('#authForm').onsubmit = e => { e.preventDefault(); const u = users.find(x => x.email === $('#email').value && x.senha === $('#password').value); if (!u) { $('#error').textContent = 'E-mail ou senha inválidos.'; return } currentUser = u; closeModal(); $('#loginBtn').textContent = 'Olá, ' + u.nome.split(' ')[0] }
}
function register() {
    modal.innerHTML = `
    <form class="box" id="registerForm">
        <button type="button" class="close" onclick="closeModal()">×</button>
        <small>NOVO CADASTRO</small>
        <h2>Faça parte<br><i>do movimento.</i></h2>
        <label>Nome<input id="name" required></label>
        <label>E-mail<input id="email" type="email" required></label>
        <label>Senha<input id="password" type="password" minlength="6" required></label>
        <p id="error" class="error"></p>
        <button class="primary">Criar conta</button>
    </form>`;

    $('#registerForm').onsubmit = e => {
        e.preventDefault();
        if (users.some(x => x.email === $('#email').value)) {
            $('#error').textContent = 'Este e-mail já está cadastrado.';
            return
        } currentUser = { id: Date.now(), nome: $('#name').value, email: $('#email').value, senha: $('#password').value, status: 'ativo' };
        users.push(currentUser);
        closeModal();
        $('#loginBtn').textContent = 'Olá, ' + currentUser.nome.split(' ')[0]
    }
}

function announce() {
    if (!currentUser) {
        auth();
        return;
    }

    modal.innerHTML = `
    <div class="box">
        <button class="close" onclick="closeModal()">×</button>

        <small>NOVO ANÚNCIO</small>
        <h2>Coloque uma peça<br><i>para circular.</i></h2>

        <form id="productForm">

            <div class="form-group">
                <label for="title">Nome da peça</label>
                <input type="text" id="title" placeholder="Ex: Blazer de linho areia" required>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="brand">Marca</label>
                    <input type="text" id="brand" placeholder="Ex: Zara" required>
                </div>

                <div class="form-group">
                    <label for="size">Tamanho</label>
                    <select id="size" required>
                        <option value="">Selecione</option>
                        <option>PP</option>
                        <option>P</option>
                        <option>M</option>
                        <option>G</option>
                        <option>GG</option>
                        <option>Único</option>
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="condition">Conservação</label>
                    <select id="condition" required>
                        <option value="">Selecione</option>
                        <option>Excelente</option>
                        <option>Ótimo</option>
                        <option>Bom</option>
                        <option>Regular</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="price">Preço (R$)</label>
                    <input type="number" id="price" min="0.01" step="0.01" placeholder="89.00" required>
                </div>
            </div>

            <div class="form-group">
                <label for="category">Categoria</label>
                <select id="category" required>
                    <option value="">Selecione</option>
                    <option>Roupas</option>
                    <option>Acessórios</option>
                    <option>Calçados</option>
                    <option>Bolsas</option>
                </select>
            </div>

            <div class="form-group">
                <label>Foto da peça</label>
                <input type="file" id="productImage" accept="image/*" required>
                <img id="imagePreview" alt="Pré-visualização da peça"
                    style="display:none;width:100%;max-height:200px;object-fit:cover;margin-top:12px;border-radius:12px;">
            </div>

            <button type="submit" class="primary">Cadastrar produto</button>

        </form>
    </div>`;

    modal.classList.remove('hidden');

    // Pré-visualização da imagem
    $('#productImage').onchange = function () {
        const file = this.files[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Selecione uma imagem válida.');
            this.value = '';
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            $('#imagePreview').src = e.target.result;
            $('#imagePreview').style.display = 'block';
        };

        reader.readAsDataURL(file);
    };

    // Cadastro do produto
    $('#productForm').onsubmit = function (e) {
        e.preventDefault();

        const file = $('#productImage').files[0];

        if (!file || !file.type.startsWith('image/')) {
            alert('Selecione uma imagem válida.');
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {

            const product = {
                id: Date.now(),
                title: $('#title').value,
                brand: $('#brand').value,
                size: $('#size').value,
                condition: $('#condition').value,
                price: Number($('#price').value),
                status: 'Disponível',
                seller: currentUser.nome,
                sellerEmail: currentUser.email,
                category: $('#category').value,
                image: e.target.result
            };

            products.push(product);

            // Salva os produtos no navegador

            localStorage.setItem('products', JSON.stringify(products));

            render();
            closeModal();

            alert('Produto cadastrado com sucesso!');
        };

        reader.readAsDataURL(file);
    };
}

function closeModal() {
    modal.classList.add('hidden')
}
$('#search').oninput = render;
$('#category').onchange = render;
$('#size').onchange = render;
$('#loginBtn').onclick = auth;
$('#announceBtn').onclick = announce;
modal.onclick = e => { if (e.target === modal) closeModal() };
load();
