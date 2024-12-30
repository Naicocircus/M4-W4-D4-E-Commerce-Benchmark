document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'https://striveschool-api.herokuapp.com/api/product/';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzY0NDA1Yjk5MDYxMDAwMTViNjc5NTciLCJpYXQiOjE3MzQ2MjMzMjMsImV4cCI6MTczNTgzMjkyM30.eK1A9a4Oa41Trb7kD4zbkQX65xJwlXiNstzecjq15Mk';

  const state = {
    products: [],
    databaseProducts: [],
    currentView: 'home'
  };

  const saveStateToLocalStorage = () => {
    localStorage.setItem('appState', JSON.stringify({
      products: state.products,
      databaseProducts: state.databaseProducts,
      currentView: state.currentView
    }));
  };

  const loadStateFromLocalStorage = () => {
    const savedState = localStorage.getItem('appState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      state.products = parsedState.products;
      state.databaseProducts = parsedState.databaseProducts;
      state.currentView = parsedState.currentView;
      return true;
    }
    return false;
  };

  const handleFetchProducts = async () => {
    try {
      console.log('Fetching products...'); // Debug
      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Dati ricevuti dal server:', data); // Debug

      if (!response.ok) {
        throw new Error(data.message || 'Errore nel recupero prodotti');
      }
      
      if (!Array.isArray(data)) {
        throw new Error('Formato dati non valido');
      }
      
      // Aggiorna il database con tutti i prodotti
      state.databaseProducts = data;

      // Filtra i prodotti pubblicati considerando sia isPublished che localStorage
      state.products = data.filter(product => 
        product.isPublished || 
        localStorage.getItem(`product_${product._id}_published`) === 'true'
      );
      
      // Salva lo stato aggiornato nel localStorage
      saveStateToLocalStorage();
      
      // Aggiorna la vista corrente
      if (state.currentView === 'home') {
        renderProducts();
      } else {
        renderDatabase();
      }

      // Aggiorna lo stato di pubblicazione nel localStorage per ogni prodotto
      data.forEach(product => {
        if (product.isPublished) {
          localStorage.setItem(`product_${product._id}_published`, 'true');
        }
      });

    } catch (error) {
      console.error('Errore nel recupero prodotti:', error);
      showNotification('Errore nel caricamento dei prodotti', 'error');
    }
  };

  const renderProducts = () => {
    const container = document.getElementById('productsContainer');
    if (!container) {
      console.error('Container prodotti non trovato');
      return;
    }

    console.log('Prodotti da renderizzare:', state.products);

    if (!Array.isArray(state.products) || state.products.length === 0) {
      container.innerHTML = '<p class="NB-no-products">Nessun prodotto disponibile</p>';
      return;
    }

    container.innerHTML = state.products.map(product => `
      <div class="NB-product-card" data-id="${product._id}">
        <div class="NB-product-image-container">
          <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" 
               onerror="this.src='placeholder.jpg'"/>
        </div>
        <div class="NB-product-info">
          <span class="NB-product-brand">${product.brand}</span>
          <h3>${product.name}</h3>
          <p class="NB-product-description">${product.description}</p>
          <div class="NB-product-footer">
            <span class="NB-price">€${product.price.toFixed(2)}</span>
            <button class="NB-view-details" aria-label="Vedi dettagli ${product.name}">
              Scopri di più
            </button>
          </div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.NB-product-card').forEach(card => {
      card.addEventListener('click', () => {
        const productId = card.dataset.id;
        window.location.href = `product.html?id=${productId}`;
      });
    });

    document.querySelectorAll('.NB-view-details').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = button.closest('.NB-product-card').dataset.id;
        const product = state.products.find(p => p._id === productId);
        if (product) {
          showProductDetails(product);
        }
      });
    });
  };

  const handleBackofficeView = () => {
    const mainContainer = document.getElementById('mainContainer');
    if (!mainContainer) {
      document.body.innerHTML = '<div id="mainContainer"></div>';
    }

    document.getElementById('mainContainer').innerHTML = `
      <div class="NB-backoffice-container">
        <div class="NB-backoffice-header">
          <h2>Gestione Prodotti</h2>
          <button id="backToHomeBtn" class="NB-back-button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Torna alla Home
          </button>
        </div>
        <div class="NB-form-container">
          <form id="productForm" class="NB-product-form">
            <div class="NB-form-group">
              <label for="name">Nome Prodotto*</label>
              <input type="text" id="name" name="name" required 
                     placeholder="Inserisci il nome del prodotto">
            </div>
            <div class="NB-form-group">
              <label for="description">Descrizione*</label>
              <input type="text" id="description" name="description" required 
                     placeholder="Inserisci la descrizione">
            </div>
            <div class="NB-form-group">
              <label for="brand">Brand*</label>
              <input type="text" id="brand" name="brand" required 
                     placeholder="Inserisci il brand">
            </div>
            <div class="NB-form-group">
              <label for="imageUrl">URL Immagine*</label>
              <input type="url" id="imageUrl" name="imageUrl" required 
                     placeholder="https://example.com/image.jpg">
            </div>
            <div class="NB-form-group">
              <label for="price">Prezzo*</label>
              <input type="number" id="price" name="price" step="0.01" min="0" required 
                     placeholder="0.00">
            </div>
            <button type="submit" class="NB-submit-button">Create Product</button>
          </form>
        </div>
        <div id="databaseContainer"></div>
      </div>
    `;

    document.getElementById('backToHomeBtn').addEventListener('click', () => {
      state.currentView = 'home';
      saveStateToLocalStorage();  // Salva lo stato aggiornato
      init();
    });

    const form = document.getElementById('productForm');
    form.addEventListener('submit', handleProductSubmit);

    handleFetchProducts().then(() => {
      renderDatabase();
    });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData(e.target);
      
      const productData = {
        name: formData.get('name').trim(),
        description: formData.get('description').trim(),
        brand: formData.get('brand').trim(),
        imageUrl: formData.get('imageUrl').trim(),
        price: Number(formData.get('price')),
        category: "generic"
      };

      console.log('Dati da inviare:', productData);

      if (!productData.name || !productData.description || !productData.brand || 
          !productData.imageUrl || !productData.price) {
        throw new Error('Tutti i campi sono obbligatori');
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });

      console.log('Status risposta:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Risposta server:', errorText);
        throw new Error(`Errore server: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Risposta successo:', responseData);

      await handleFetchProducts();
      
      e.target.reset();
      renderDatabase();
      showNotification('Prodotto aggiunto con successo!');

    } catch (error) {
      console.error('Errore completo:', error);
      showNotification(`Errore: ${error.message}`, 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `NB-notification ${type}`;
    notification.innerHTML = `
      <div class="NB-notification-content">
        <span style="color: #000000">${message}</span>
        <button class="NB-notification-close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);

    const closeBtn = notification.querySelector('.NB-notification-close');
    closeBtn.addEventListener('click', () => notification.remove());
  };

  const init = () => {
    // Prova a caricare lo stato salvato
    const hasStoredState = loadStateFromLocalStorage();
    
    // Se siamo nel backoffice, mostra direttamente quella vista
    if (state.currentView === 'backoffice') {
      handleBackofficeView();
      return;  // Importante: usciamo dalla funzione qui
    }

    // Altrimenti, mostra la home
    document.body.innerHTML = `
      <div id="mainContainer" class="NB-main-container">
        <nav class="NB-nav-container">
          <div class="NB-nav-logo"> Components</div>
          <button id="backofficeBtn" class="NB-nav-button">
            <span>Backoffice</span>
          </button>
        </nav>
        <header class="NB-hero">
          <h1>TechCore Depot</h1>
          <p>Scopri la nostra selezione di prodotti esclusivi</p>
          <div class="NB-hero-image">
            <img src="Logo Store.png" alt="Hero background">
          </div>
          <div class="NB-hero-background"></div>
        </header>
        <div id="productsContainer" class="NB-products-grid"></div>
      </div>
    `;

    document.getElementById('backofficeBtn').addEventListener('click', () => {
      state.currentView = 'backoffice';
      saveStateToLocalStorage();  // Salva lo stato aggiornato
      handleBackofficeView();
    });

    // Se abbiamo uno stato salvato, renderizza i prodotti
    if (hasStoredState) {
      renderProducts();
    } else {
      // Altrimenti, recupera i prodotti dal server
      handleFetchProducts();
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const response = await fetch(`${API_URL}${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione del prodotto');
      }

      state.products = state.products.filter(product => product._id !== productId);
      
      renderProducts();
      
      showNotification('Prodotto eliminato con successo!');
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      showNotification('Errore durante l\'eliminazione del prodotto', 'error');
    }
  };

  const showProductDetails = (product) => {
    // Salva il contenuto precedente
    const previousContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <div class="NB-product-detail-container">
        <nav class="NB-nav-container">
          <button id="backToHomeBtn" class="NB-back-button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Torna alla Home
          </button>
        </nav>
        
        <div class="NB-product-detail">
          <div class="NB-product-detail-image">
            <img src="${product.imageUrl}" alt="${product.name}" />
          </div>
          
          <div class="NB-product-detail-info">
            <span class="NB-product-brand">${product.brand}</span>
            <h1>${product.name}</h1>
            <p class="NB-product-description">${product.description}</p>
            <div class="NB-product-price">
              <span>€${product.price.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('backToHomeBtn').addEventListener('click', () => {
      // Ripristina il contenuto precedente
      document.body.innerHTML = previousContent;
      
      // Riattacca gli event listener
      attachEventListeners();
      
      // Assicurati che lo state sia corretto
      state.currentView = 'home';
    });
  };

  // Nuova funzione per riattaccare gli event listener
  const attachEventListeners = () => {
    // Riattacca l'event listener al pulsante backoffice
    const backofficeBtn = document.getElementById('backofficeBtn');
    if (backofficeBtn) {
        backofficeBtn.addEventListener('click', () => {
            if (state.currentView === 'home') {
                state.currentView = 'backoffice';
                handleBackofficeView();
            } else {
                state.currentView = 'home';
                init();
                renderProducts();
            }
        });
    }

    // Riattacca gli event listener alle card
    document.querySelectorAll('.NB-product-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.id;
            window.location.href = `product.html?id=${productId}`;
        });
    });

    // Riattacca gli event listener ai pulsanti "Scopri di più"
    document.querySelectorAll('.NB-view-details').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = button.closest('.NB-product-card').dataset.id;
            const product = state.products.find(p => p._id === productId);
            if (product) {
                showProductDetails(product);
            }
        });
    });
  };

  const renderDatabase = () => {
    const databaseContainer = document.getElementById('databaseContainer');
    if (!databaseContainer) return;

    console.log('Database prodotti:', state.databaseProducts);

    databaseContainer.innerHTML = `
      <div class="NB-database-container">
        <h3>Database Prodotti</h3>
        <div class="NB-database-grid">
          ${state.databaseProducts.map(product => {
              const isPublished = product.isPublished || 
                                localStorage.getItem(`product_${product._id}_published`) === 'true';
              
              return `
                <div class="NB-database-item" data-id="${product._id}">
                    <div class="NB-database-item-content">
                        <img src="${product.imageUrl}" alt="${product.name}" class="NB-database-item-image">
                        <div class="NB-database-item-info">
                            <h4>${product.name}</h4>
                            <p>${product.brand}</p>
                            <span class="NB-database-item-price">€${product.price.toFixed(2)}</span>
                            <span class="NB-database-item-status ${isPublished ? 'published' : ''}">
                                ${isPublished ? 'Pubblicato' : 'Non pubblicato'}
                            </span>
                        </div>
                    </div>
                    <div class="NB-database-item-actions">
                        <button class="NB-edit-btn" data-id="${product._id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Modifica
                        </button>
                        <button class="NB-publish-btn ${isPublished ? 'unpublish' : ''}" data-id="${product._id}">
                            ${isPublished ? 'Rimuovi dalla Home' : 'Pubblica in Home'}
                        </button>
                        <button class="NB-delete-db-btn" data-id="${product._id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                            Elimina
                        </button>
                    </div>
                </div>
              `;
          }).join('')}
        </div>
      </div>
    `;

    // Aggiungi event listeners
    document.querySelectorAll('.NB-publish-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.currentTarget.dataset.id;
            handlePublishProduct(productId);
        });
    });

    document.querySelectorAll('.NB-delete-db-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.currentTarget.dataset.id;
            if (confirm('Sei sicuro di voler eliminare questo prodotto?')) {
                handleDeleteFromDatabase(productId);
            }
        });
    });

    document.querySelectorAll('.NB-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.currentTarget.dataset.id;
            const product = state.databaseProducts.find(p => p._id === productId);
            if (product) {
                showEditModal(product, e);
            }
        });
    });
  };

  const handlePublishProduct = async (productId) => {
    const product = state.databaseProducts.find(p => p._id === productId);
    if (!product) return;

    try {
        const isCurrentlyPublished = product.isPublished || 
            localStorage.getItem(`product_${productId}_published`) === 'true';
        
        const updatedProduct = {
            ...product,
            isPublished: !isCurrentlyPublished
        };

        console.log('Aggiornamento prodotto:', updatedProduct);

        const response = await fetch(`${API_URL}${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedProduct)
        });

        if (!response.ok) {
            throw new Error('Errore nell\'aggiornamento del prodotto');
        }

        const serverResponse = await response.json();
        console.log('Risposta server:', serverResponse);

        // Aggiorna immediatamente lo stato del prodotto nel database locale
        state.databaseProducts = state.databaseProducts.map(p => 
            p._id === productId ? {...p, isPublished: !isCurrentlyPublished} : p
        );

        // Aggiorna l'array dei prodotti pubblicati
        if (!isCurrentlyPublished) {
            state.products.push(updatedProduct);
            localStorage.setItem(`product_${productId}_published`, 'true');
            showNotification('Prodotto pubblicato nella home!');
        } else {
            state.products = state.products.filter(p => p._id !== productId);
            localStorage.removeItem(`product_${productId}_published`);
            showNotification('Prodotto rimosso dalla home!');
        }

        // Salva lo stato aggiornato
        saveStateToLocalStorage();
        
        // Aggiorna le viste
        renderDatabase();
        if (state.currentView === 'home') {
            renderProducts();
        }

    } catch (error) {
        console.error('Errore durante la pubblicazione:', error);
        showNotification('Errore durante la pubblicazione', 'error');
    }
  };

  const handleDeleteFromDatabase = async (productId) => {
    try {
      // Prima verifichiamo se l'utente vuole davvero eliminare il prodotto
      if (!confirm('Sei sicuro di voler eliminare questo prodotto? L\'operazione non può essere annullata.')) {
        return;
      }

      console.log('Eliminazione prodotto con ID:', productId);

      // Chiamata API per eliminare il prodotto
      const response = await fetch(`${API_URL}${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Errore nella cancellazione: ${response.status}`);
      }

      // Rimuovi il prodotto dallo state locale
      state.databaseProducts = state.databaseProducts.filter(p => p._id !== productId);
      state.products = state.products.filter(p => p._id !== productId);
      
      // Aggiorna l'interfaccia
      renderDatabase();
      if (state.currentView === 'home') {
        renderProducts();
      }

      // Mostra notifica di successo
      showNotification('Prodotto eliminato con successo dall\'API e dal database locale');
      
      // Opzionale: ricarica i dati dall'API per assicurarsi che tutto sia sincronizzato
      await handleFetchProducts();

    } catch (error) {
      console.error('Errore durante l\'eliminazione:', error);
      showNotification(`Errore durante l'eliminazione: ${error.message}`, 'error');
    }
  };

  const checkAPIContent = async () => {
    try {
      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Contenuto attuale dell\'API:', data);
      
      // Mostra anche il numero totale di prodotti
      console.log('Numero totale di prodotti:', data.length);
      
      // Mostra i dettagli di ogni prodotto in modo più leggibile
      data.forEach((product, index) => {
        console.log(`\nProdotto ${index + 1}:`);
        console.log('ID:', product._id);
        console.log('Nome:', product.name);
        console.log('Descrizione:', product.description);
        console.log('Brand:', product.brand);
        console.log('Prezzo:', product.price);
        console.log('URL Immagine:', product.imageUrl);
        console.log('Pubblicato:', product.isPublished ? 'Sì' : 'No');
      });

    } catch (error) {
      console.error('Errore nel recupero dei dati:', error);
    }
  };

  // Puoi chiamare questa funzione quando vuoi controllare il contenuto dell'API
  checkAPIContent();

  const showEditModal = (product, clickEvent) => {
    const modal = document.createElement('div');
    modal.className = 'NB-modal';
    
    // Posiziona inizialmente il modale fuori dalla vista
    modal.style.opacity = '0';
    document.body.appendChild(modal);

    modal.innerHTML = `
      <div class="NB-modal-content">
        <div class="NB-modal-header">
          <h3>Modifica Prodotto</h3>
          <button class="NB-modal-close">×</button>
        </div>
        <form id="editProductForm" class="NB-product-form">
          <div class="NB-form-group">
            <label for="editName">Nome Prodotto*</label>
            <input type="text" id="editName" name="name" required 
                   value="${product.name}" placeholder="Inserisci il nome del prodotto">
          </div>
          <div class="NB-form-group">
            <label for="editDescription">Descrizione*</label>
            <input type="text" id="editDescription" name="description" required 
                   value="${product.description}" placeholder="Inserisci la descrizione">
          </div>
          <div class="NB-form-group">
            <label for="editBrand">Brand*</label>
            <input type="text" id="editBrand" name="brand" required 
                   value="${product.brand}" placeholder="Inserisci il brand">
          </div>
          <div class="NB-form-group">
            <label for="editImageUrl">URL Immagine*</label>
            <input type="url" id="editImageUrl" name="imageUrl" required 
                   value="${product.imageUrl}" placeholder="https://example.com/image.jpg">
          </div>
          <div class="NB-form-group">
            <label for="editPrice">Prezzo*</label>
            <input type="number" id="editPrice" name="price" step="0.01" min="0" required 
                   value="${product.price}" placeholder="0.00">
          </div>
          <div class="NB-modal-actions">
            <button type="button" class="NB-button-secondary" id="cancelEdit">Annulla</button>
            <button type="submit" class="NB-button-primary">Salva Modifiche</button>
          </div>
        </form>
      </div>
    `;

    // Dopo che il modale è stato aggiunto al DOM, rendilo visibile
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
    });

    // Gestione chiusura modale
    const closeModal = () => {
      modal.classList.add('fade-out');
      setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector('.NB-modal-close').addEventListener('click', closeModal);
    modal.querySelector('#cancelEdit').addEventListener('click', closeModal);

    // Click fuori dal modale per chiudere
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Gestione submit del form
    const form = modal.querySelector('#editProductForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const formData = new FormData(form);
        const updatedProduct = {
          ...product,
          name: formData.get('name').trim(),
          description: formData.get('description').trim(),
          brand: formData.get('brand').trim(),
          imageUrl: formData.get('imageUrl').trim(),
          price: Number(formData.get('price'))
        };

        const response = await fetch(`${API_URL}${product._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedProduct)
        });

        if (!response.ok) {
          throw new Error('Errore nell\'aggiornamento del prodotto');
        }

        await handleFetchProducts();
        showNotification('Prodotto aggiornato con successo!');
        closeModal();

      } catch (error) {
        console.error('Errore durante l\'aggiornamento:', error);
        showNotification('Errore durante l\'aggiornamento del prodotto', 'error');
      }
    });
  };

  init();
});
