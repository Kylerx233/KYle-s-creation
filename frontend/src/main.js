import { App } from './app.js';
import './style.css';

const appRoot = document.getElementById('app');
const app = new App(appRoot);
app.start();