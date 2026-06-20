export async function fetchSflixPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.text();
}

export async function fetchTmdbMetadata({ query, apiKey, type }) {
  if (!apiKey) return { error: "No TMDB API Key provided" };
  const searchType = type === 'series' ? 'tv' : 'movie';
  const url = `https://api.themoviedb.org/3/search/${searchType}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=es-MX`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`TMDB HTTP error! status: ${response.status}`);
  const data = await response.json();
  if (data && data.results && data.results.length > 0) return { result: data.results[0] };

  const enUrl = `https://api.themoviedb.org/3/search/${searchType}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US`;
  const enResponse = await fetch(enUrl);
  if (enResponse.ok) {
    const enData = await enResponse.json();
    if (enData && enData.results && enData.results.length > 0) return { result: enData.results[0] };
  }

  return { error: "No results found" };
}

export async function fetchOmdbRatings({ query, apiKey, year }) {
  if (!apiKey) return { error: "No OMDb API Key provided" };
  let url = `https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=${apiKey}`;
  if (year) url += `&y=${year}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`OMDb HTTP error! status: ${response.status}`);
  const data = await response.json();
  if (data && data.Response === "True") {
    return { ratings: data.Ratings, imdbRating: data.imdbRating, plot: data.Plot };
  }
  return { error: data.Error || "Not found" };
}

