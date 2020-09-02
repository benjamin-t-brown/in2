import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider } from 'react-jss';
import MainContainer from './main-container';
import css from './css';

let container = document.createElement('div');
document.body.prepend(container);
let Main = (global.Main = {});

const App = () => (
  <ThemeProvider theme={css}>
    <MainContainer main={Main} />
  </ThemeProvider>
);

Main.render = function () {
  ReactDOM.render(<App />, container);
};
Main.render();
