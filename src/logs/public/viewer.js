
const filterForm= document.getElementById('filter-form');
filterForm.onsubmit= e => {
  console.log('submit');
};

document.querySelectorAll('[data-auto-submit]').forEach( element => {
  element.onchange= () => {
    if( element.name !== 'page' ) {
      filterForm.elements.namedItem('page').value= 0;
    }

    filterForm.submit();
  };
});
