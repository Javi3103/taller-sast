const API_URL = 'http://localhost:3000/api';

// ==================== CATEGORÍAS ====================
async function loadCategories(searchTerm = null) {
    let url = `${API_URL}/categories`;
    if (searchTerm && searchTerm.trim() !== '') {
        url = `${API_URL}/categories/search?name=${encodeURIComponent(searchTerm)}`;
    }
    const res = await fetch(url);
    const categories = await res.json();
    
    // Llenar el select de productos (sin XSS aquí)
    const select = document.getElementById('productCategory');
    select.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });
    
    // Mostrar lista de categorías con XSS almacenado (NO se escapa el nombre)
    const container = document.getElementById('categoryList');
    container.innerHTML = '';
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'list-group-item d-flex justify-content-between align-items-center';
        // PELIGRO: innerHTML con nombre sin sanitizar -> XSS
        div.innerHTML = `
            <span>${cat.name}</span>
            <div>
                <button class="btn btn-sm btn-warning me-1" onclick="editCategory(${cat.id}, '${escapeHtml(cat.name)}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCategory(${cat.id})">🗑️</button>
            </div>
        `;
        container.appendChild(div);
    });
}

window.deleteCategory = async (id) => {
    await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
    loadCategories();
    loadProducts();
};

window.editCategory = async (id, oldName) => {
    const newName = prompt('Nuevo nombre:', oldName);
    if (newName) {
        await fetch(`${API_URL}/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        loadCategories();
    }
};

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('categoryName').value;
    await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    document.getElementById('categoryName').value = '';
    loadCategories();
});

// Búsqueda SQLi en categorías
document.getElementById('searchCategoryBtn').addEventListener('click', () => {
    const term = document.getElementById('searchCategoryInput').value;
    loadCategories(term);
});
document.getElementById('resetCategoryBtn').addEventListener('click', () => {
    document.getElementById('searchCategoryInput').value = '';
    loadCategories();
});

// ==================== PRODUCTOS ====================
async function loadProducts(searchTerm = null) {
    let url = `${API_URL}/products`;
    if (searchTerm && searchTerm.trim() !== '') {
        url = `${API_URL}/products/search?name=${encodeURIComponent(searchTerm)}`;
    }
    const res = await fetch(url);
    const products = await res.json();
    
    const container = document.getElementById('productList');
    container.innerHTML = '';
    products.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'list-group-item';
        // XSS almacenado en productos también
        div.innerHTML = `
            <div class="d-flex justify-content-between">
                <h5>${prod.name}</h5>
                <strong>$${prod.price}</strong>
            </div>
            <p>${prod.description || ''}</p>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct(${prod.id})">Eliminar</button>
            <button class="btn btn-sm btn-warning" onclick="editProduct(${prod.id})">Editar</button>
        `;
        container.appendChild(div);
    });
}

window.deleteProduct = async (id) => {
    await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
    loadProducts();
};

window.editProduct = async (id) => {
    const newName = prompt('Nuevo nombre:');
    const newPrice = prompt('Nuevo precio:');
    if (newName && newPrice) {
        await fetch(`${API_URL}/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, price: parseFloat(newPrice), description: '', category_id: 1 })
        });
        loadProducts();
    }
};

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('productName').value;
    const description = document.getElementById('productDesc').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const category_id = parseInt(document.getElementById('productCategory').value);
    await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, price, category_id })
    });
    document.getElementById('productForm').reset();
    loadProducts();
});

document.getElementById('searchProductBtn').addEventListener('click', () => {
    const term = document.getElementById('searchProductInput').value;
    loadProducts(term);
});
document.getElementById('resetProductBtn').addEventListener('click', () => {
    document.getElementById('searchProductInput').value = '';
    loadProducts();
});

// ==================== COMMAND INJECTION ====================
document.getElementById('execCmdBtn').addEventListener('click', async () => {
    const cmd = document.getElementById('cmdInput').value;
    const res = await fetch(`${API_URL}/exec?cmd=${encodeURIComponent(cmd)}`);
    const data = await res.json();
    const output = data.stdout || data.stderr || data.error || 'Sin salida';
    document.getElementById('cmdOutput').innerText = `Comando: ${cmd}\n\n${output}`;
});

// Helper para escapar solo en botones (para que no rompa el onclick)
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Inicializar
loadCategories();
loadProducts();