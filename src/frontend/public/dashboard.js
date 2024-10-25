
document.getElementById('visualization-selector').onchange= e => {
  const selectElem= e.target;
  const optionElem= selectElem.options[ selectElem.selectedIndex ];
  const frameUrl= optionElem.getAttribute('data-frame-url');
  const frameElem= document.getElementById('content-frame');
  const parentElem= frameElem.parentNode;
  
  // Change the iframe source URL without creating a history entry
  frameElem.remove();
  frameElem.src= frameUrl;
  parentElem.appendChild( frameElem );
}
