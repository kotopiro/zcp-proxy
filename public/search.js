async function search() {
  const q = document.getElementById("q").value;
  const proxy = "/?url=";

  const api = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  const url = proxy + encodeURIComponent(api);

  const res = await fetch(url);
  const text = await res.text();

  document.getElementById("results").innerText = text.slice(0, 500);
}
