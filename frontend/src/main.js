import { App } from './app.js';
import { AudioManager } from './systems/audio/audioManager.js';
import './style.css';

const homepage = document.getElementById('homepage');
const enterBtn = document.getElementById('home-enter');
const appRoot = document.getElementById('app');
const audio = new AudioManager();

enterBtn.addEventListener('click', () => {
  audio.start('mountains'); // 首页进入 → 空山私语

  homepage.style.transition = 'opacity .8s ease, transform .8s ease';
  homepage.style.opacity = '0';
  homepage.style.transform = 'scale(1.05)';
  homepage.style.pointerEvents = 'none';

  setTimeout(() => {
    homepage.remove();
    const app = new App(appRoot, audio);
    app.start();
  }, 800);
});