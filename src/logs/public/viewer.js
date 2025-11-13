function setupEventHandlers() {
  const filterForm = document.getElementById('filter-form');
  filterForm.onsubmit = async e => {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const url = new URL(form.action);
    url.search = new URLSearchParams(formData).toString();

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'error'
      });

      const data = await response.text();

      if (!response.ok) {
        throw new Error(`Server did not respond ok: ${data}`);
      }

      // Replace the entire page content with the response data
      document.open();
      document.write(data);
      document.close();
      setupEventHandlers();

      // Update the URL without adding a history entry
      window.history.replaceState({}, '', url);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  document.querySelectorAll('[data-auto-submit]').forEach(element => {
    element.onchange = () => {
      if (element.name !== 'page') {
        filterForm.elements.namedItem('page').value = 0;
      }

      filterForm.requestSubmit();
    };
  });

  document.getElementById('clear-text-search-field').onclick= () => {
    document.getElementById('text-search-field').value= '';
  }
}

setupEventHandlers();
