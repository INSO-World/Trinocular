
const interval = setInterval(async () => {
  try {
    const pathname = window.location.pathname;
    const uuid = pathname.substring(pathname.lastIndexOf('/') + 1);
    const resp = await fetch(`/wait/${uuid}/update`, {redirect: 'error'});

    if (!resp.ok) {
      throw new Error(`Fetching update returned status ${resp.status}`);
    }

    if (resp.status === 204) {
      window.location.pathname = `/dashboard/${uuid}`;
      clearInterval(interval);
      return;
    }

    const html = await resp.text();
    document.getElementById('status-container').innerHTML = html;
  } catch (e) {
    console.error(e);
  }
}, 2000);
