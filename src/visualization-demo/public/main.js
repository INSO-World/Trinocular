
const pageURL= new URL(window.location.href);
const baseURL= pageURL.origin+ pageURL.pathname.replace('index.html', '');

async function loadDatasSet() {
  const source= pageURL.searchParams.get('show') || 'apples';
  const response= await fetch( `${baseURL}/data/${source}` );
  return await response.json();
}

function setupControls() {
  const parentDoc= window.parent.document;
  const containerElem= parentDoc.getElementById('custom-controls');
  
  // Very cursed, do not keep, do not get inspired by this
  containerElem.innerHTML= `
    <div>
      <label for="first-control">1st control</label>
      <input type="text" id="first-control" value="${ pageURL.searchParams.get('show') }">
    </div>
    <div>
      <label for="second-control">2nd control</label>
      <input type="number" id="second-control">
    </div>
  `;

  const spanElem= document.createElement('span');
  document.body.appendChild(spanElem);

  parentDoc.getElementById('second-control').onchange= e => {
    spanElem.innerText= e.target.value;
  };
}

(async function() {
  setupControls();

  const data= await loadDatasSet();
  console.table( data );


})();
