
document.getElementById('reimport-button').addEventListener('click', async event => {

  if(!confirm('Do you really want to delete and re-import all repository data?')) {
    return;
  }

  // Dumb way to prevent the user from clicking the button immediately again
  event.target.disabled= true;
  
  const csrfToken = document.querySelector('input[name="csrfToken"]').value;
  const resp= await fetch('/api/reimport', {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': csrfToken }
  });

  if( !resp.ok ) {
    console.error('Could not re-import repositories, server responded with:', resp.status);
  }
});

