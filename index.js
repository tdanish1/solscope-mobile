import { getRandomValues as expoCryptoGetRandomValues } from 'expo-crypto';
import { Buffer } from 'buffer';
import { registerRootComponent } from 'expo';
import App from './App';

global.Buffer = Buffer;

class CryptoPolyfill {
  getRandomValues = expoCryptoGetRandomValues;
}

const webCrypto = typeof crypto !== 'undefined' ? crypto : new CryptoPolyfill();

if (typeof global.crypto === 'undefined') {
  global.crypto = webCrypto;
}

registerRootComponent(App);