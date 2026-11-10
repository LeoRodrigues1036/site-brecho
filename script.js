
let products = [];
let users = [];
let currentUser = null;

const $ = selector => document.querySelector(selector);
const modal = $('#modal');

const STORAGE = {
    products: 'products',
    users: 'users',
    session: 'currentUser'
};



function saveProducts() {
    localStorage.setItem(STORAGE.products, JSON.stringify(products));
}

function saveUsers() {
    localStorage.setItem(STORAGE.users, JSON.stringify(users));
}

function saveSession() {
    if (currentUser) {
        localStorage.setItem(STORAGE.session, JSON.stringify({
            id: currentUser.id,
            email: currentUser.email
        }));
    }
}

function restoreSession() {
    const savedSession = localStorage.getItem(STORAGE.session);

    if (!savedSession) return;

    try {
        const session = JSON.parse(savedSession);

        currentUser = users.find(user =>
            user.id === session.id &&
            user.email === session.email
        ) || null;
    } catch {
        currentUser = null;
        localStorage.removeItem(STORAGE.session);
    }
}

function updateAccountButtons() {
    const loginBtn = $('#loginBtn');

    if (!loginBtn) return;

    let myAdsBtn = $('#myAdsBtn');
    let logoutBtn = $('#logoutBtn');

    if (currentUser) {
        loginBtn.textContent = 'Olá, ' + currentUser.nome.split(' ')[0];
        loginBtn.onclick = myAds;

        if (!myAdsBtn) {
            myAdsBtn = document.createElement('button');
            myAdsBtn.id = 'myAdsBtn';
            myAdsBtn.className = 'text-btn';
            myAdsBtn.textContent = 'Meus anúncios';
            loginBtn.insertAdjacentElement('afterend', myAdsBtn);
        }

        myAdsBtn.onclick = myAds;

        if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutBtn';
            logoutBtn.className = 'text-btn';
            logoutBtn.textContent = 'Sair';
            myAdsBtn.insertAdjacentElement('afterend', logoutBtn);
        }

        logoutBtn.onclick = logout;

    } else {
        loginBtn.textContent = 'Entrar';
        loginBtn.onclick = auth;

        myAdsBtn?.remove();
        logoutBtn?.remove();
    }
}



async function load() {
    try {
        const savedProducts = localStorage.getItem(STORAGE.products);
        const savedUsers = localStorage.getItem(STORAGE.users);

        if (savedProducts) {
            products = JSON.parse(savedProducts);
        } else {
            products = await fetch('./BD/products.json').then(r => {
                if (!r.ok) throw new Error('Erro ao carregar produtos');
                return r.json();
            });
        }

        const fileUsers = await fetch('./BD/users.json').then(r => {
            if (!r.ok) throw new Error('Erro ao carregar usuários');
            return r.json();
        });

        const localUsers = savedUsers ? JSON.parse(savedUsers) : [];

        // Mantém usuários cadastrados localmente e os do arquivo JSON.
        users = [...fileUsers];

        localUsers.forEach(localUser => {
            if (!users.some(user => user.email === localUser.email)) {
                users.push(localUser);
            }
        });

        restoreSession();
        updateAccountButtons();
        render();

    } catch (error) {
        console.error(error);
        $('#products').innerHTML = '<p>Não foi possível carregar os produtos.</p>';
    }
}



function render() {
    const q = $('#search').value.toLowerCase();
    const cat = $('#category').value;
    const size = $('#size').value;

    const list = products.filter(p =>
        (p.title + ' ' + p.brand).toLowerCase().includes(q) &&
        (cat === 'Todas' || p.category === cat) &&
        (size === 'Todos' || p.size === size)
    );

    $('#products').innerHTML = list.map(p => `
        <article class="card" data-id="${p.id}">
            <img src="${p.image}" alt="${p.title}">
            <h3>
                ${p.title}
                <span class="price">
                    R$ ${Number(p.price).toFixed(2).replace('.', ',')}
                </span>
            </h3>
            <p>${p.brand} · Tam. ${p.size} · ${p.status}</p>
        </article>
    `).join('') || '<p>Nenhuma peça encontrada.</p>';

    document.querySelectorAll('.card').forEach(card => {
        card.onclick = () => {
            const product = products.find(p => p.id == card.dataset.id);
            if (product) detail(product);
        };
    });
}



function isOwner(product) {
    if (!currentUser) return false;

    // Compatibilidade com anúncios antigos.
    return product.sellerId === currentUser.id ||
        (!product.sellerId && product.sellerEmail === currentUser.email);
}



function detail(p) {
    const owner = isOwner(p);

    modal.innerHTML = `
        <div class="box">
            <button class="close" onclick="closeModal()">×</button>

            <img src="${p.image}"
                style="width:100%;height:220px;object-fit:cover"
                alt="${p.title}">

            <h2>${p.title}</h2>

            <p>${p.brand} · Tamanho ${p.size} · ${p.condition}</p>

            <h3>R$ ${Number(p.price).toFixed(2).replace('.', ',')}</h3>

            <p>
                Anunciado por <b>${p.seller}</b><br>
                ${p.sellerEmail}
            </p>

            ${
                owner
                ? `
                    <button class="primary" id="editProductBtn">
                        Editar anúncio
                    </button>

                    <button class="text-btn" id="deleteProductBtn">
                        Excluir anúncio
                    </button>
                `
                : `
                    <button class="primary" onclick="alert('Entre em contato pelo e-mail do anunciante.')">
                        Tenho interesse
                    </button>
                `
            }
        </div>
    `;

    modal.classList.remove('hidden');

    if (owner) {
        $('#editProductBtn').onclick = () => editProduct(p.id);
        $('#deleteProductBtn').onclick = () => deleteProduct(p.id);
    }
}



function auth() {
    modal.innerHTML = `
        <form class="box" id="authForm">
            <button type="button" class="close" onclick="closeModal()">×</button>

            <small>ÁREA DO USUÁRIO</small>
            <h2>Bem-vindo<br><i>de volta.</i></h2>

            <label>
                E-mail
                <input id="email" type="email" required>
            </label>

            <label>
                Senha
                <input id="password" type="password" required minlength="6">
            </label>

            <p id="error" class="error"></p>

            <button class="primary">Entrar</button>

            <p>
                <button type="button" class="text-btn" onclick="register()">
                    Ainda não tenho conta — criar agora
                </button>
            </p>
        </form>
    `;

    modal.classList.remove('hidden');

    $('#authForm').onsubmit = e => {
        e.preventDefault();

        const email = $('#email').value.trim().toLowerCase();
        const password = $('#password').value;

        const user = users.find(x =>
            x.email.toLowerCase() === email &&
            x.senha === password
        );

        if (!user) {
            $('#error').textContent = 'E-mail ou senha inválidos.';
            return;
        }

        currentUser = user;

        saveSession();
        updateAccountButtons();

        closeModal();
        alert('Login realizado com sucesso!');
    };
}



function register() {
    modal.innerHTML = `
        <form class="box" id="registerForm">
            <button type="button" class="close" onclick="closeModal()">×</button>

            <small>NOVO CADASTRO</small>
            <h2>Faça parte<br><i>do movimento.</i></h2>

            <label>
                Nome
                <input id="name" required>
            </label>

            <label>
                E-mail
                <input id="email" type="email" required>
            </label>

            <label>
                Senha
                <input id="password" type="password" minlength="6" required>
            </label>

            <p id="error" class="error"></p>

            <button class="primary">Criar conta</button>
        </form>
    `;

    modal.classList.remove('hidden');

    $('#registerForm').onsubmit = e => {
        e.preventDefault();

        const email = $('#email').value.trim().toLowerCase();

        if (users.some(x => x.email.toLowerCase() === email)) {
            $('#error').textContent = 'Este e-mail já está cadastrado.';
            return;
        }

        currentUser = {
            id: Date.now(),
            nome: $('#name').value.trim(),
            email,
            senha: $('#password').value,
            status: 'ativo'
        };

        users.push(currentUser);

        saveUsers();
        saveSession();
        updateAccountButtons();

        closeModal();

        alert('Conta criada com sucesso!');
    };
}



function logout() {
    currentUser = null;

    localStorage.removeItem(STORAGE.session);

    updateAccountButtons();

    closeModal();

    alert('Você saiu da sua conta.');
}



function myAds() {
    if (!currentUser) {
        auth();
        return;
    }

    const myProducts = products.filter(isOwner);

    modal.innerHTML = `
        <div class="box">
            <button class="close" onclick="closeModal()">×</button>

            <small>ÁREA DO VENDEDOR</small>
            <h2>Meus <i>anúncios.</i></h2>

            <button class="primary" id="newProductBtn">
                + Novo anúncio
            </button>

            <div class="my-products">
                ${
                    myProducts.length
                    ? myProducts.map(p => `
                        <div class="my-product">
                            <img src="${p.image}" alt="${p.title}"
                                style="width:85px;height:85px;object-fit:cover">

                            <div>
                                <strong>${p.title}</strong>
                                <p>R$ ${Number(p.price).toFixed(2).replace('.', ',')}</p>

                                <button type="button" class="text-btn"
                                    onclick="editProduct(${p.id})">
                                    Editar
                                </button>

                                <button type="button" class="text-btn"
                                    onclick="deleteProduct(${p.id})">
                                    Excluir
                                </button>
                            </div>
                        </div>
                    `).join('')
                    : '<p>Você ainda não publicou nenhum anúncio.</p>'
                }
            </div>
        </div>
    `;

    modal.classList.remove('hidden');

    $('#newProductBtn').onclick = announce;
}



function announce() {
    if (!currentUser) {
        auth();
        return;
    }

    productForm();
}


function editProduct(id) {
    const product = products.find(p => p.id == id);

    if (!product || !isOwner(product)) {
        alert('Você não tem permissão para editar este anúncio.');
        return;
    }

    productForm(product);
}



function productForm(product = null) {
    const editing = Boolean(product);

    modal.innerHTML = `
        <div class="box">
            <button class="close" onclick="closeModal()">×</button>

            <small>${editing ? 'EDITAR ANÚNCIO' : 'NOVO ANÚNCIO'}</small>

            <h2>
                ${editing ? 'Atualize sua' : 'Coloque uma peça'}
                <br><i>${editing ? 'peça.' : 'para circular.'}</i>
            </h2>

            <form id="productForm">

                <div class="form-group">
                    <label for="productTitle">Nome da peça</label>
                    <input type="text" id="productTitle"
                        value="${editing ? product.title : ''}"
                        placeholder="Ex: Moletom oversized" required>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="productBrand">Marca</label>
                        <input type="text" id="productBrand"
                            value="${editing ? product.brand : ''}"
                            placeholder="Ex: Nike" required>
                    </div>

                    <div class="form-group">
                        <label for="productSize">Tamanho</label>
                        <select id="productSize" required>
                            <option value="">Selecione</option>
                            ${['PP', 'P', 'M', 'G', 'GG', 'Único'].map(size =>
                                `<option value="${size}" ${editing && product.size === size ? 'selected' : ''}>${size}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="productCondition">Conservação</label>
                        <select id="productCondition" required>
                            <option value="">Selecione</option>
                            ${['Excelente', 'Ótimo', 'Bom', 'Regular'].map(condition =>
                                `<option value="${condition}" ${editing && product.condition === condition ? 'selected' : ''}>${condition}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="productPrice">Preço (R$)</label>
                        <input type="number" id="productPrice"
                            min="0.01" step="0.01"
                            value="${editing ? product.price : ''}"
                            placeholder="89.00" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="productCategory">Categoria</label>
                    <select id="productCategory" required>
                        <option value="">Selecione</option>
                        ${['Roupas', 'Acessórios', 'Calçados', 'Bolsas'].map(category =>
                            `<option value="${category}" ${editing && product.category === category ? 'selected' : ''}>${category}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="productImage">Foto da peça ${editing ? '(opcional)' : ''}</label>

                    <input type="file" id="productImage" accept="image/*"
                        ${editing ? '' : 'required'}>

                    <img id="imagePreview"
                        src="${editing ? product.image : ''}"
                        alt="Pré-visualização da peça"
                        style="display:${editing ? 'block' : 'none'};width:100%;max-height:200px;object-fit:cover;margin-top:12px;border-radius:12px;">
                </div>

                <button id="button-add" type="submit" class="primary">
                    ${editing ? 'Salvar alterações' : 'Cadastrar produto'}
                </button>

            </form>
        </div>
    `;

    modal.classList.remove('hidden');

    const form = $('#productForm');
    const imageInput = $('#productImage');
    const preview = $('#imagePreview');

    imageInput.onchange = function () {
        const file = this.files[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Selecione uma imagem válida.');
            this.value = '';
            return;
        }

        const reader = new FileReader();

        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };

        reader.readAsDataURL(file);
    };

    form.onsubmit = e => {
        e.preventDefault();

        const file = imageInput.files[0];

        function saveProduct(image) {
            const data = {
                title: $('#productTitle').value.trim(),
                brand: $('#productBrand').value.trim(),
                size: $('#productSize').value,
                condition: $('#productCondition').value,
                price: Number($('#productPrice').value),
                category: $('#productCategory').value,
                image
            };

            if (editing) {
                const index = products.findIndex(p => p.id === product.id);

                if (index === -1 || !isOwner(products[index])) {
                    alert('Você não tem permissão para alterar este anúncio.');
                    return;
                }

                products[index] = {
                    ...products[index],
                    ...data
                };

            } else {
                products.push({
                    id: Date.now(),
                    ...data,
                    status: 'Disponível',
                    seller: currentUser.nome,
                    sellerEmail: currentUser.email,
                    sellerId: currentUser.id
                });
            }

            try {
                saveProducts();
                render();
                closeModal();

                alert(editing
                    ? 'Anúncio atualizado com sucesso!'
                    : 'Produto cadastrado com sucesso!'
                );

            } catch (error) {
                alert('Não foi possível salvar. O armazenamento pode estar cheio.');
            }
        }

        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Selecione uma imagem válida.');
                return;
            }

            const reader = new FileReader();

            reader.onload = e => saveProduct(e.target.result);
            reader.readAsDataURL(file);

        } else if (editing) {
            saveProduct(product.image);

        } else {
            alert('Selecione uma imagem para o produto.');
        }
    };
}



function deleteProduct(id) {
    const product = products.find(p => p.id == id);

    if (!product || !isOwner(product)) {
        alert('Você não tem permissão para excluir este anúncio.');
        return;
    }

    const confirmed = confirm(
        `Deseja realmente excluir o anúncio "${product.title}"?`
    );

    if (!confirmed) return;

    products = products.filter(p => p.id != id);

    saveProducts();
    render();
    myAds();

    alert('Anúncio excluído com sucesso!');
}



function closeModal() {
    modal.classList.add('hidden');
}

$('#search').oninput = render;
$('#category').onchange = render;
$('#size').onchange = render;

$('#loginBtn').onclick = auth;
$('#announceBtn').onclick = announce;

modal.onclick = e => {
    if (e.target === modal) closeModal();
};

load();
