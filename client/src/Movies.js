import React, {useEffect, useState} from 'react';
import Movie from './components/Movie';
import './App.css';

const APIKEY = process.env.REACT_APP_API_KEY;
const FEATURED_API = `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${APIKEY}&language=ru&page=`;

function App() {
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    getMovies(FEATURED_API + 1);
  }, []);

  const getMovies = (API) => {
    fetch(API)
    .then((res) => res.json())
    .then((data) => setMovies(data.results));
  }

  return (
    <main id="main">
      {movies.length > 0 && movies.map(movie => (
        <Movie key={movie.id} {...movie}/>
      ))}
    </main>
  );
}

export default App;