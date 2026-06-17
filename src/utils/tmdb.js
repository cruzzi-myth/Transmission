import axios from "axios";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
export const IMG_BASE = "https://image.tmdb.org/t/p/original";
export const IMG_BASE_W500 = "https://image.tmdb.org/t/p/w500";

const tmdb = axios.create({
  baseURL: BASE_URL,
  params: { api_key: API_KEY, language: "en-US" },
});

export const getTrending = (mediaType = "all", timeWindow = "week") =>
  tmdb.get(`/trending/${mediaType}/${timeWindow}`).then((r) => r.data.results);

export const getByGenre = (genreId, mediaType = "movie") =>
  tmdb.get(`/discover/${mediaType}`, { params: { with_genres: genreId } }).then((r) => r.data.results);

export const getMovieDetails = (id, mediaType = "movie") =>
  tmdb
    .get(`/${mediaType}/${id}`, { params: { append_to_response: "videos,credits,similar" } })
    .then((r) => r.data);

export const searchMulti = (query) =>
  tmdb.get("/search/multi", { params: { query } }).then((r) => r.data.results);
